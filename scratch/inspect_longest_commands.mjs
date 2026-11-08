import fs from 'fs';

const items = JSON.parse(fs.readFileSync('d:/mtm/scratch/analyzed_commands.json', 'utf8'));

console.log('--- DETAILS OF TOP 15 LONGEST COMMANDS ---');
const sorted = [...items].sort((a,b) => b.durationMs - a.durationMs);
sorted.slice(0, 15).forEach((t, i) => {
  console.log(`\n#${i+1} [Index ${t.index}] Tool: ${t.toolName} | Status: ${t.phase} | Duration: ${t.durationSec}s | Started: ${t.startedAt}`);
  console.log(t.summary);
});

