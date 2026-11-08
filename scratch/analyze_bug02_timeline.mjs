import fs from 'fs';

const commands = JSON.parse(fs.readFileSync('d:/mtm/scratch/ytfhp47k_commands.json', 'utf8'));

console.log('=== BUG-02 FULL TIMELINE ===');
for (let i = 53; i < commands.length; i++) {
  const c = commands[i];
  const input = c.input || '';
  const output = c.output || '';
  if (input.includes('TASK-03')) break;

  // Print command and errors
  const isErr = output.includes('Error') || output.includes('fail') || output.includes('Timeout') || output.includes('exit_code":1');
  console.log(`\n[#${i + 1} | ${c.time}] ${isErr ? '❌ ERROR' : '✅ OK'}`);
  console.log('INPUT:', input.replace(/\r?\n/g, ' ').slice(0, 180));
  if (isErr || input.includes('capture') || input.includes('submit') || input.includes('plan')) {
    console.log('OUTPUT:', output.replace(/\r?\n/g, ' ').slice(0, 300));
  }
}

