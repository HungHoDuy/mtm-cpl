import fs from 'fs';

const r1 = JSON.parse(fs.readFileSync('d:/mtm/scratch/lc2tr4y2_rollout_1.json', 'utf8'));

// Look for turn 1 or response_item with tools
const toolsLine = r1.find(e => e.tools || (e.payload && e.payload.tools));
if (toolsLine) {
  console.log('Tools found in rollout entry:');
  console.log(toolsLine.tools || toolsLine.payload.tools);
} else {
  console.log('Searching all entries for tool definitions...');
  // check raw rollout
  const rawFirstLines = fs.readFileSync('C:/Users/ADMIN/.codex/sessions/2026/11/02/rollout-2026-11-02T16-18-56-01a19b8d-fc86-75a1-bdb6-7c6e2b873ede.jsonl', 'utf8').split('\n').slice(0, 10);
  for (const l of rawFirstLines) {
    if (!l.trim()) continue;
    const p = JSON.parse(l);
    if (p.payload?.tools) {
      console.log('Found tools in line:', p.payload.tools.map(t => t.name || t.type));
    }
  }
}

