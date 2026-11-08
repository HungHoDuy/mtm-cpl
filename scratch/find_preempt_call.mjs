import fs from 'fs';

const commands = JSON.parse(fs.readFileSync('d:/mtm/scratch/ytfhp47k_commands.json', 'utf8'));

for (let i = 0; i < commands.length; i++) {
  const c = commands[i];
  if (c.input && c.input.includes('preempt_work')) {
    console.log(`preempt_work found at index ${i + 1}:`, c.time);
    console.log('INPUT:', c.input);
    console.log('OUTPUT:', c.output);

    console.log('\n--- Preceding 5 commands: ---');
    for (let j = Math.max(0, i - 5); j < i; j++) {
      console.log(`[#${j + 1}] ${commands[j].time}: ${commands[j].input.slice(0, 150)}`);
      if (commands[j].output) {
        console.log(`    OUTPUT: ${commands[j].output.slice(0, 200)}`);
      }
    }
    break;
  }
}

