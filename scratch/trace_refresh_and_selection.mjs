import fs from 'fs';

const r1 = JSON.parse(fs.readFileSync('d:/mtm/scratch/lc2tr4y2_rollout_1.json', 'utf8'));

console.log('=== TRACING REFRESH_MATCH AND START_WORK ===');
for (const entry of r1) {
  const ts = entry.time;
  const inputStr = typeof entry.input === 'string' ? entry.input : JSON.stringify(entry.input || {});
  if (inputStr.includes('refresh_match') || inputStr.includes('start_work') || inputStr.includes('submit_work')) {
    console.log(`[${ts}] TOOL: ${entry.name} -> ${inputStr.slice(0, 150)}`);
  }
  if (entry.type === 'assistant' && (entry.text.includes('PI-01') || entry.text.includes('refresh') || entry.text.includes('backlog') || entry.text.includes('priority') || entry.text.includes('BUG-03') || entry.text.includes('CR-01'))) {
    console.log(`[${ts}] ASSISTANT: ${entry.text.slice(0, 200)}...`);
  }
}

