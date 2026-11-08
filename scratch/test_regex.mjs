import fs from 'node:fs';

const html = fs.readFileSync('D:\\mtm\\scratch\\match_Y1KH6CB9.html', 'utf8');

const regex = /<span class="font-mono text-zinc-300">\s*(TASK-[0-9]+|CR-[0-9]+|BUG-[0-9]+|PI-[0-9]+)\s*<\/span>([\s\S]*?)(?:<\/div>|<h3)/gi;
let m;
const items = [];
const seen = new Set();
while ((m = regex.exec(html)) !== null) {
  const key = m[1];
  if (seen.has(key)) continue;
  seen.add(key);

  const fullBlock = m[2];
  
  // Extract status
  const statusMatch = fullBlock.match(/<span class="rounded border px-2 py-0.5 [^"]*">\s*(OPEN|VISIBLE|CLOSED|IN_PROGRESS|COMPLETED)\s*<\/span>/i);
  const status = statusMatch ? statusMatch[1].toUpperCase() : 'UNKNOWN';

  // Extract points
  const ptsMatch = fullBlock.match(/(\d+)\s*(?:<!-- -->)?\s*pts/i);
  const points = ptsMatch ? parseInt(ptsMatch[1], 10) : 100;

  // Extract deadline
  let deadlineMinutes = null;
  const dlMatch = fullBlock.match(/Deadline\s*·\s*(\d+)\s*min/i) || fullBlock.match(/(\d+)\s*(?:m|min|minutes?)(?:\s*countdown|\s*deadline)?/i);
  if (dlMatch) {
    deadlineMinutes = parseInt(dlMatch[1], 10);
  }
  const hasDeadline = Boolean(deadlineMinutes) || fullBlock.toLowerCase().includes('deadline');

  items.push({ key, status, points, hasDeadline, deadlineMinutes });
}

console.log(items);

