import fs from 'node:fs';

const html = fs.readFileSync('D:\\mtm\\scratch\\match_Y1KH6CB9.html', 'utf8');

let idx = 0;
while ((idx = html.toLowerCase().indexOf('deadline', idx)) !== -1) {
  console.log('=== Found "deadline" at offset', idx, '===');
  const start = Math.max(0, idx - 150);
  const end = Math.min(html.length, idx + 250);
  console.log(html.slice(start, end));
  console.log('\n----------------------------------------\n');
  idx += 8;
}

