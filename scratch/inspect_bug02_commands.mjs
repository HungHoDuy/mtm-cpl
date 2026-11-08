import fs from 'fs';

const items = JSON.parse(fs.readFileSync('d:/mtm/scratch/analyzed_commands.json', 'utf8'));

console.log('--- SEQUENCE FOR BUG-02 (Items 10 to 35) ---');
for (let i = 9; i < 35; i++) {
  const t = items[i];
  console.log(`[#${t.index}] ${t.toolName} | ${t.phase} | ${t.durationSec}s | Started: ${t.startedAt}`);
  console.log(`     Cmd: ${t.summary.slice(0, 140).replace(/\n/g, ' ')}`);
}

