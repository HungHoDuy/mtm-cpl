import fs from 'fs';

const calls = JSON.parse(fs.readFileSync('d:/mtm/scratch/oi1ofz0i_extracted_calls.json', 'utf8'));
for (let i = 25; i <= 125; i++) {
  const c = calls[i];
  if (!c) continue;
  let str = c.input || c.output || c.text || '';
  if (typeof str !== 'string') str = JSON.stringify(str);
  console.log(`[${i}] ${c.ts} | ${c.type} | ${c.name || ''} | ${str.slice(0, 140)}`);
}

