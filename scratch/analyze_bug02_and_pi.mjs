import fs from 'fs';

const commands = JSON.parse(fs.readFileSync('d:/mtm/scratch/ytfhp47k_commands.json', 'utf8'));

console.log('Total commands:', commands.length);

for (let i = 0; i < commands.length; i++) {
  const c = commands[i];
  const input = c.input || '';
  const output = c.output || '';

  // Check if it's related to BUG-02, PI-01, preempt, get_next_task, start_work
  if (input.includes('BUG-02') || input.includes('PI-01') || input.includes('preempt') || input.includes('get_next_task') || input.includes('start_work')) {
    console.log(`\n================= [#${i + 1}] ${c.time} =================`);
    console.log('INPUT:', input.slice(0, 300));
    console.log('OUTPUT:', output.slice(0, 400));
  }
}

