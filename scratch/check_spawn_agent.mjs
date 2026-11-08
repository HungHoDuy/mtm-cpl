import fs from 'fs';

const rawFirstLines = fs.readFileSync('C:/Users/ADMIN/.codex/sessions/2026/11/02/rollout-2026-11-02T16-18-56-01a19b8d-fc86-75a1-bdb6-7c6e2b873ede.jsonl', 'utf8').split('\n').slice(0, 5);
for (const l of rawFirstLines) {
  if (!l.trim()) continue;
  const p = JSON.parse(l);
  if (p.payload?.tools) {
    const collab = p.payload.tools.find(t => t.name === 'collaboration');
    if (collab) {
      const spawnTool = collab.tools.find(st => st.name === 'spawn_agent');
      console.log('spawn_agent description:');
      console.log(spawnTool?.description);
      console.log('spawn_agent inputSchema:');
      console.log(JSON.stringify(spawnTool?.inputSchema, null, 2));
    }
  }
}

