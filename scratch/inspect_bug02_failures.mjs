import fs from 'fs';

const commands = JSON.parse(fs.readFileSync('d:/mtm/scratch/ytfhp47k_commands.json', 'utf8'));

console.log('=== All failures during BUG-02 ===');
for (let i = 53; i < 136; i++) {
  const c = commands[i];
  const out = c.output || '';
  if (out.includes('Error') || out.includes('Timeout') || out.includes('fail') || out.includes('exit_code":1')) {
    console.log(`\n[#${i + 1} | ${c.time}]`);
    console.log('INPUT:', c.input.replace(/\r?\n/g, ' ').slice(0, 150));
    console.log('ERROR:', out.replace(/\r?\n/g, ' ').slice(0, 300));
  }
}

