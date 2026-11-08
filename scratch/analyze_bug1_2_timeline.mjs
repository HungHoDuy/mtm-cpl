import fs from 'fs';

const r1 = JSON.parse(fs.readFileSync('d:/mtm/scratch/lc2tr4y2_rollout_1.json', 'utf8'));

console.log('=== Chronological Breakdown: Preparation to BUG-01 ===');
for (const entry of r1) {
  const ts = entry.time;
  // filter up to 09:45:00Z
  if (ts > '2026-11-02T09:45:00.000Z') continue;

  if (entry.type === 'assistant') {
    console.log(`\n[${ts}] ASSISTANT:`);
    console.log(entry.text?.slice(0, 300));
  } else if (entry.type === 'tool_call') {
    const inputStr = typeof entry.input === 'string' ? entry.input : JSON.stringify(entry.input);
    console.log(`[${ts}] TOOL: ${entry.name} -> ${inputStr.slice(0, 150)}`);
  }
}

