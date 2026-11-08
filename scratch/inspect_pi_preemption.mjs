import fs from 'fs';

const commands = JSON.parse(fs.readFileSync('d:/mtm/scratch/ytfhp47k_commands.json', 'utf8'));

for (let i = 65; i < 118; i++) {
  const c = commands[i];
  console.log(`\n--- [#${i + 1}] ${c.time} ---`);
  console.log('INPUT:', (c.input || '').replace(/\r?\n/g, ' ').slice(0, 180));
  console.log('OUTPUT:', (c.output || '').replace(/\r?\n/g, ' ').slice(0, 200));
}

