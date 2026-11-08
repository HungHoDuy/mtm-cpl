import fs from 'fs';

const commands = JSON.parse(fs.readFileSync('d:/mtm/scratch/ytfhp47k_commands.json', 'utf8'));

for (let i = 80; i < 107; i++) {
  const c = commands[i];
  console.log(`\n================= [#${i + 1}] ${c.time} =================`);
  console.log('INPUT:', c.input);
  console.log('OUTPUT:', c.output);
}

