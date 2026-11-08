import fs from 'fs';

const snapshot = JSON.parse(fs.readFileSync('d:/mtm/scratch/parsed_snapshot.json', 'utf8'));
const tools = snapshot.toolActivity;

console.log(`Total tool/command executions: ${tools.length}`);

const analyzed = tools.map((t, idx) => {
  const start = new Date(t.startedAt).getTime();
  const end = new Date(t.timestamp).getTime();
  const durationMs = end - start;
  const durationSec = (durationMs / 1000).toFixed(1);
  return {
    index: idx + 1,
    toolName: t.toolName,
    operation: t.operation,
    phase: t.phase,
    startedAt: t.startedAt,
    finishedAt: t.timestamp,
    durationMs,
    durationSec: Number(durationSec),
    summary: t.summary
  };
});

// Group by phase
const completed = analyzed.filter(t => t.phase === 'COMPLETED');
const failed = analyzed.filter(t => t.phase === 'FAILED');

console.log(`Completed: ${completed.length}, Failed: ${failed.length}`);

console.log('\n========================================');
console.log(' ALL FAILED COMMANDS & WHY THEY FAILED:');
console.log('========================================');
failed.forEach(f => {
  console.log(`\n[#${f.index}] Tool: ${f.toolName} | Op: ${f.operation} | Duration: ${f.durationSec}s | Started: ${f.startedAt}`);
  console.log(`Summary: ${f.summary}`);
});

console.log('\n========================================');
console.log(' TOP 20 LONGEST RUNNING COMMANDS:');
console.log('========================================');
const sorted = [...analyzed].sort((a, b) => b.durationMs - a.durationMs);
sorted.slice(0, 20).forEach((t, i) => {
  console.log(`#${i+1} [Item ${t.index}] ${t.toolName} | ${t.phase} | ${t.durationSec}s (${Math.floor(t.durationSec/60)}m ${(t.durationSec%60).toFixed(1)}s)`);
  console.log(`   Cmd: ${t.summary.slice(0, 150).replace(/\n/g, ' ')}...`);
});

fs.writeFileSync('d:/mtm/scratch/analyzed_commands.json', JSON.stringify(analyzed, null, 2));
console.log('\nSaved full analysis to d:/mtm/scratch/analyzed_commands.json');

