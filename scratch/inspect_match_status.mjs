import fs from 'fs';

const lines = fs.readFileSync('D:/mtm/CPL/team-sdlc-pack/logs/LC2TR4Y2.match-status.ndjson', 'utf8')
  .trim().split('\n').filter(Boolean).map(l => JSON.parse(l));

const allKeys = new Set();
for (const l of lines) {
  Object.keys(l).forEach(k => allKeys.add(k));
}
console.log('All unique keys in match-status:', Array.from(allKeys));
const statuses = new Set(lines.map(l => l.status));
console.log('Unique statuses:', Array.from(statuses));
