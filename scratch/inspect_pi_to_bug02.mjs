import fs from 'fs';

const calls = JSON.parse(fs.readFileSync('d:/mtm/scratch/oi1ofz0i_extracted_calls.json', 'utf8'));
for (let i = 70; i <= 116; i++) {
  const c = calls[i];
  if (!c) continue;
  console.log(`\n=================== [${i}] ${c.ts} | ${c.type} | ${c.name || ''} ===================`);
  console.log(c.input || c.output || c.text || '');
}

