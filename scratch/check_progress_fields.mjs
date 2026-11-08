import fs from 'fs';

const lines = fs.readFileSync('D:/mtm/CPL/team-sdlc-pack/logs/LC2TR4Y2.progress.ndjson', 'utf8')
  .trim().split('\n').filter(Boolean).map(l => JSON.parse(l));

console.log('Sample line 0:', JSON.stringify(lines[0]));
console.log('Sample line 10:', JSON.stringify(lines[10]));
console.log('Sample line 20:', JSON.stringify(lines[20]));
console.log('Any timestamp field?');
const fields = new Set();
lines.forEach(l => Object.keys(l).forEach(k => fields.add(k)));
console.log('All fields:', Array.from(fields));

