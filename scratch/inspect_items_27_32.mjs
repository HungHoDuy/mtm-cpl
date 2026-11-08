import fs from 'fs';

const items = JSON.parse(fs.readFileSync('d:/mtm/scratch/analyzed_commands.json', 'utf8'));

for (let i = 26; i <= 31; i++) {
  const t = items[i];
  console.log(`\n--- Item #${t.index} (${t.phase}, ${t.durationSec}s) ---`);
  console.log(t.summary);
}

