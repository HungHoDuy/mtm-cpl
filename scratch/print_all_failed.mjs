import fs from 'fs';

const snapshot = JSON.parse(fs.readFileSync('d:/mtm/scratch/parsed_snapshot.json', 'utf8'));

const failed = snapshot.toolActivity
  .map((t, idx) => ({ ...t, index: idx + 1 }))
  .filter(t => t.phase === 'FAILED');

console.log(`Total failed commands: ${failed.length}`);

failed.forEach(f => {
  const durSec = ((new Date(f.timestamp).getTime() - new Date(f.startedAt).getTime()) / 1000).toFixed(1);
  console.log(`\n======================================================`);
  console.log(`[#${f.index}] ${f.toolName} | Duration: ${durSec}s | Started: ${f.startedAt}`);
  console.log(f.summary);
});

