import fs from 'node:fs';

const html = fs.readFileSync('D:/mtm/scratch/match_Y1KH6CB9.html', 'utf8');

function refreshMatchTest(html) {
  const discoveredItems = [];
  const foundKeys = new Set();

  // Layer 1: Authoritative Next.js SSR embedded JSON state
  const jsonMatch = html.match(/\\?"backlog\\?":\s*(\[[\s\S]*?\])(?:,\s*\\?"events\\?"|,\s*"events")/i);
  if (jsonMatch) {
    try {
      let jsonStr = jsonMatch[1];
      if (jsonStr.includes('\\"')) {
        jsonStr = jsonStr.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      }
      const parsedBacklog = JSON.parse(jsonStr);
      if (Array.isArray(parsedBacklog) && parsedBacklog.length > 0) {
        for (const raw of parsedBacklog) {
          const key = (raw.key || raw.backlogId || '').toUpperCase();
          if (!key || foundKeys.has(key)) continue;
          foundKeys.add(key);
          const title = raw.title || raw.backlogTitle || `${key} Challenge`;
          const status = (raw.status || 'OPEN').toUpperCase();
          const points = typeof raw.points === 'number' ? raw.points : 100;
          const deadlineMinutes = (typeof raw.deadlineMinutes === 'number' && raw.deadlineMinutes > 0) ? raw.deadlineMinutes : null;
          const hasDeadline = deadlineMinutes !== null || Boolean(raw.deadlineMinutes);
          discoveredItems.push({ key, title, status, points, hasDeadline, deadlineMinutes });
        }
      }
    } catch (e) {
      console.log('Failed to parse Next.js embedded backlog JSON:', e.message);
    }
  }

  // Layer 2: UI Card parsing targeting font-mono key and full header block (including deadline badge after status badge)
  const cardRegex = /<span class="font-mono text-zinc-300">\s*(TASK-[0-9]+|CR-[0-9]+|BUG-[0-9]+|PI-[0-9]+)\s*<\/span>([\s\S]*?)(?:<\/div>\s*<h3|<section\b)/gi;
  let match;
  while ((match = cardRegex.exec(html)) !== null) {
    const key = match[1].toUpperCase();
    const cardBlock = match[2] || '';
    if (!foundKeys.has(key)) {
      foundKeys.add(key);
      const title = `${key} Challenge`;

      const statusMatch = cardBlock.match(/class="rounded border px-2 py-0.5 [^"]*">\s*(OPEN|VISIBLE|CLOSED|IN_PROGRESS|COMPLETED)\s*<\/span>/i);
      const status = statusMatch ? statusMatch[1].toUpperCase() : 'OPEN';

      const ptsMatch = cardBlock.match(/(\d+)\s*(?:<!-- -->)?\s*pts/i);
      const points = ptsMatch ? parseInt(ptsMatch[1], 10) : (key.startsWith('CR-') ? 300 : key.startsWith('PI-') ? 250 : key.startsWith('BUG-') ? 200 : 100);

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

      // Check if deadlineMinutes is present anywhere in html for this key
      if (!hasDeadline) {
        const jsonDlRegex = new RegExp(`\\\\?"key\\\\?":\\\\?"${key}\\\\?"(?:(?!\\\\?"key\\\\?":)[\\s\\S])*?\\\\?"deadlineMinutes\\\\?":(\\d+|null)`, 'i');
        const jsonDlMatch = html.match(jsonDlRegex);
        if (jsonDlMatch && jsonDlMatch[1] !== 'null') {
          hasDeadline = true;
          deadlineMinutes = parseInt(jsonDlMatch[1], 10);
        }
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

const items = refreshMatchTest(html);
console.log('Final Triage Result (All Items):');
items.forEach((it, idx) => console.log(`[#${idx}] ${it.key}: points=${it.points}, hasDeadline=${it.hasDeadline}, dlMins=${it.deadlineMinutes}, title="${it.title}"`));

console.log('\nScenario: BUG-01 & BUG-02 already submitted, remaining available items:');
const available = items.filter(it => ['CR-01', 'CR-02', 'BUG-03', 'BUG-04', 'PI-01'].includes(it.key));
available.forEach((it, idx) => console.log(`[#${idx}] ${it.key}: points=${it.points}, hasDeadline=${it.hasDeadline}, dlMins=${it.deadlineMinutes}`));

