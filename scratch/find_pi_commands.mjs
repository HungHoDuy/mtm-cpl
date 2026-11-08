import fs from 'fs';

const commands = JSON.parse(fs.readFileSync('d:/mtm/scratch/ytfhp47k_commands.json', 'utf8'));

for (let i = 0; i < commands.length; i++) {
  const c = commands[i];
  if (c.input && (c.input.includes('PI-01') || c.input.includes('PI_01') || c.input.includes('preempt_work'))) {
    console.log(`[#${i + 1} | ${c.time}]`);
    console.log('INPUT:', c.input.replace(/\r?\n/g, ' ').slice(0, 200));
    console.log('OUTPUT:', (c.output || '').replace(/\r?\n/g, ' ').slice(0, 250));
  }
}

