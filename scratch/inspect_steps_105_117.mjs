import fs from 'fs';

const cmds = JSON.parse(fs.readFileSync('d:/mtm/scratch/ytfhp47k_commands.json', 'utf8'));
for (const idx of [105, 112, 113, 114, 115, 116, 117]) {
  const c = cmds[idx];
  console.log(`=== STEP #${idx} ===`);
  console.log(`INPUT: ${c.input}`);
  console.log(`OUTPUT: ${c.output}`);
}

