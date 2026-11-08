import fs from 'fs';

const cmds = JSON.parse(fs.readFileSync('d:/mtm/scratch/ytfhp47k_commands.json', 'utf8'));
console.log('=== STEP 93 OUTPUT ===');
console.log(cmds[93].output);
console.log('=== STEP 95 OUTPUT ===');
console.log(cmds[95].output);
console.log('=== STEP 96 OUTPUT ===');
console.log(cmds[96].output);

