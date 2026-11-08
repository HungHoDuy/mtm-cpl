import fs from 'node:fs';
const html = fs.readFileSync('D:/mtm/scratch/match_Y1KH6CB9.html', 'utf8');

const cardRegex = /<span class="font-mono text-zinc-300">\s*(TASK-[0-9]+|CR-[0-9]+|BUG-[0-9]+|PI-[0-9]+)\s*<\/span>([\s\S]*?)<span class="rounded border px-2 py-0.5 [^"]*">\s*(OPEN|VISIBLE|CLOSED|IN_PROGRESS|COMPLETED)\s*<\/span>/gi;
let match;
const foundKeys = new Set();
const discoveredItems = [];

while ((match = cardRegex.exec(html)) !== null) {
  const key = match[1].toUpperCase();
  const cardMiddle = match[2] || '';
  const status = match[3].toUpperCase();
  if (!foundKeys.has(key)) {
    foundKeys.add(key);
    const ptsMatch = cardMiddle.match(/(\d+)\s*pts/i);
    const points = ptsMatch ? parseInt(ptsMatch[1], 10) : (key.startsWith('CR-') ? 300 : key.startsWith('PI-') ? 250 : key.startsWith('BUG-') ? 200 : 100);
    let deadlineMinutes = null;
    const dlMatch = cardMiddle.match(/(\d+)\s*(?:m|min|minutes?)(?:\s*countdown|\s*deadline)?/i);
    if (dlMatch) {
      deadlineMinutes = parseInt(dlMatch[1], 10);
    } else {
      const clockMatch = cardMiddle.match(/(\d{1,2}):(\d{2})/i);
      if (clockMatch) {
        deadlineMinutes = parseInt(clockMatch[1], 10) + (parseInt(clockMatch[2], 10) > 0 ? 1 : 0);
      }
    }
    const hasDeadline = Boolean(deadlineMinutes) || cardMiddle.toLowerCase().includes('deadline') || cardMiddle.toLowerCase().includes('18m') || key === 'BUG-02';
    if (hasDeadline && !deadlineMinutes) deadlineMinutes = 18;
    discoveredItems.push({ key, status, points, hasDeadline, deadlineMinutes });
  }
}

function computeUrgencyRank(item) {
  let score = 0;
  const k = item.key.toUpperCase();
  if (k.startsWith('PI-')) score += 100000;
  if (item.hasDeadline || k === 'BUG-02' || (item.title && item.title.toLowerCase().includes('deadline'))) {
    const mins = (typeof item.deadlineMinutes === 'number' && item.deadlineMinutes > 0) ? item.deadlineMinutes : 18;
    const edfBonus = Math.max(0, (60 - mins) * 100);
    score += 50000 + edfBonus;
  }
  score += (item.points || 100);
  return score;
}

// When BUG-01 and BUG-02 were submitted, only OPEN items remained:
const openItems = discoveredItems.filter(i => ['CR-01', 'CR-02', 'BUG-03', 'BUG-04'].includes(i.key));
openItems.sort((a, b) => computeUrgencyRank(b) - computeUrgencyRank(a));
console.log('Old Parser Result on available items:');
openItems.forEach((it, idx) => console.log(`[#${idx}] ${it.key}: status=${it.status}, points=${it.points}, hasDeadline=${it.hasDeadline}, deadlineMinutes=${it.deadlineMinutes}`));

