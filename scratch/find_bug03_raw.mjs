import fs from 'node:fs';

const html = fs.readFileSync('D:\\mtm\\scratch\\match_Y1KH6CB9.html', 'utf8');

// Find all occurrences of BUG-03
let idx = 0;
while ((idx = html.indexOf('BUG-03', idx)) !== -1) {
  console.log('=== Found BUG-03 at offset', idx, '===');
  const start = Math.max(0, idx - 200);
  const end = Math.min(html.length, idx + 400);
  console.log(html.slice(start, end));
  console.log('\n----------------------------------------\n');
  idx += 6;
}

