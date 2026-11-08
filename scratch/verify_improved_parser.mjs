import fs from 'node:fs';

const html = fs.readFileSync('D:\\mtm\\scratch\\match_Y1KH6CB9.html', 'utf8');

function parseBacklogs(html) {
  const discoveredItems = [];
  const foundKeys = new Set();

  // Primary: Match card header block containing key, badges, points, and deadline
  const cardRegex = /<span class="font-mono text-zinc-300">\s*(TASK-[0-9]+|CR-[0-9]+|BUG-[0-9]+|PI-[0-9]+)\s*<\/span>([\s\S]*?)(?:<\/div>\s*<h3|<section\b)/gi;
  let match;

  while ((match = cardRegex.exec(html)) !== null) {
    const key = match[1].toUpperCase();
    const cardBlock = match[2] || '';
    if (!foundKeys.has(key)) {
      foundKeys.add(key);
      const title = `${key} Challenge`;

      // Status
      const statusMatch = cardBlock.match(/class="rounded border px-2 py-0.5 [^"]*">\s*(OPEN|VISIBLE|CLOSED|IN_PROGRESS|COMPLETED)\s*<\/span>/i);
      const status = statusMatch ? statusMatch[1].toUpperCase() : 'OPEN';

      // Points (handles Next.js <!-- --> comment between number and pts)
      const ptsMatch = cardBlock.match(/(\d+)\s*(?:<!-- -->)?\s*pts/i);
      const points = ptsMatch ? parseInt(ptsMatch[1], 10) : (key.startsWith('CR-') ? 300 : key.startsWith('PI-') ? 250 : key.startsWith('BUG-') ? 200 : 100);

      // Deadline extraction from HTML badge
      let deadlineMinutes = null;
      const dlBadgeMatch = cardBlock.match(/Deadline\s*·\s*(\d+)\s*min/i);
      const dlTextMatch = cardBlock.match(/(\d+)\s*(?:m|min|minutes?)(?:\s*countdown|\s*deadline)?/i);
      const clockMatch = cardBlock.match(/(\d{1,2}):(\d{2})\s*left/i);

      if (dlBadgeMatch) {
        deadlineMinutes = parseInt(dlBadgeMatch[1], 10);
      } else if (dlTextMatch) {
        deadlineMinutes = parseInt(dlTextMatch[1], 10);
      } else if (clockMatch) {
        deadlineMinutes = parseInt(clockMatch[1], 10) + (parseInt(clockMatch[2], 10) > 0 ? 1 : 0);
      }

      let hasDeadline = Boolean(deadlineMinutes) || cardBlock.toLowerCase().includes('deadline');

      // Secondary check: embedded Next.js SSR stream payload
      const jsonKeyRegex = new RegExp(`\\\\?"key\\\\?":\\\\?"${key}\\\\?"[\\s\\S]*?\\\\?"deadlineMinutes\\\\?":(\\d+)`, 'i');
      const jsonDlMatch = html.match(jsonKeyRegex);
      if (jsonDlMatch && jsonDlMatch[1]) {
        hasDeadline = true;
        if (!deadlineMinutes) {
          deadlineMinutes = parseInt(jsonDlMatch[1], 10);
        }
      }

      if (hasDeadline && !deadlineMinutes) {
        deadlineMinutes = 15;
      }

      discoveredItems.push({ key, title, status, points, hasDeadline, deadlineMinutes });
    }
  }

  // Multi-Criteria Triage Sorting: PI > Earliest Deadline First (EDF) > Points Descending
  function computeUrgencyRank(item) {
    let score = 0;
    const k = item.key.toUpperCase();
    
    // Priority 1: Product Incidents (Highest Urgency)
    if (k.startsWith('PI-')) score += 100000;
    
    // Priority 2: Earliest Deadline First (EDF)
    if (item.hasDeadline) {
      const mins = (typeof item.deadlineMinutes === 'number' && item.deadlineMinutes > 0) ? item.deadlineMinutes : 18;
      const edfBonus = Math.max(0, (60 - mins) * 100);
      score += 50000 + edfBonus;
    }
    
    // Priority 3: Points Value
    score += (item.points || 100);
    return score;
  }

  discoveredItems.sort((a, b) => computeUrgencyRank(b) - computeUrgencyRank(a));
  return discoveredItems;
}

const parsed = parseBacklogs(html);
console.log('Parsed and Sorted Items:');
parsed.forEach((it, idx) => {
  console.log(`[#${idx}] ${it.key}: status=${it.status}, points=${it.points}, hasDeadline=${it.hasDeadline}, deadlineMinutes=${it.deadlineMinutes}`);
});

