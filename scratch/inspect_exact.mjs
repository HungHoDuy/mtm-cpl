import fs from 'fs';

const cmds = JSON.parse(fs.readFileSync('d:/mtm/scratch/ytfhp47k_commands.json', 'utf8'));
const inspectIndices = [97, 98, 99, 100, 104, 105, 111, 112, 113, 114, 115, 116, 117, 118];
for (const idx of inspectIndices) {
  const c = cmds[idx];
  console.log(`=== STEP #${idx} (${c.time}) ===`);
  console.log(`INPUT:\n${c.input}`);
  console.log(`OUTPUT:\n${c.output}\n`);
}

