import fs from 'fs';

const r1 = JSON.parse(fs.readFileSync('d:/mtm/scratch/lc2tr4y2_rollout_1.json', 'utf8'));

console.log('=== PI-01 ROLLOUT ACTIONS ===');
for (const entry of r1) {
  const ts = entry.time;
  if (ts >= '2026-11-02T09:44:20.000Z' && ts <= '2026-11-02T09:46:50.000Z') {
    if (entry.type === 'assistant') {
      console.log(`\n[${ts}] ASSISTANT: ${entry.text.slice(0, 300)}`);
    } else if (entry.type === 'tool_call') {
      const inputStr = typeof entry.input === 'string' ? entry.input : JSON.stringify(entry.input);
      console.log(`[${ts}] TOOL: ${entry.name} -> ${inputStr.slice(0, 200)}`);
    }
  }
}

