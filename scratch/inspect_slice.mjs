import fs from 'fs';

const cmds = JSON.parse(fs.readFileSync('d:/mtm/scratch/ytfhp47k_commands.json', 'utf8'));
cmds.slice(95, 125).forEach((c, i) => {
  const actualIdx = 95 + i;
  console.log(`[#${actualIdx}] ${c.time} | ${c.input.slice(0, 110).replace(/\r?\n/g, ' ')}`);
  if (c.output) {
    console.log(`     OUT: ${c.output.slice(0, 120).replace(/\r?\n/g, ' ')}`);
  }
});

