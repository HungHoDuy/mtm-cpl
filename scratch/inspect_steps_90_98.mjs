import fs from 'fs';

const cmds = JSON.parse(fs.readFileSync('d:/mtm/scratch/ytfhp47k_commands.json', 'utf8'));
cmds.slice(90, 99).forEach((c, i) => {
  const actualIdx = 90 + i;
  console.log('=== STEP #' + actualIdx + ' (' + c.time + ') ===');
  console.log('INPUT:', c.input.slice(0, 160).replace(/\r?\n/g, ' '));
  console.log('OUTPUT:', c.output.slice(0, 160).replace(/\r?\n/g, ' '));
});

