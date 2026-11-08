import fs from 'fs';

const rawFirstLines = fs.readFileSync('C:/Users/ADMIN/.codex/sessions/2026/11/02/rollout-2026-11-02T16-18-56-01a19b8d-fc86-75a1-bdb6-7c6e2b873ede.jsonl', 'utf8').split('\n').slice(0, 5);
for (const l of rawFirstLines) {
  if (!l.trim()) continue;
  const p = JSON.parse(l);
  if (p.payload?.tools) {
    p.payload.tools.forEach(t => {
      console.log(`Top tool: ${t.name} (${t.type})`);
      if (t.tools) {
        t.tools.forEach(sub => console.log(`   - ${sub.name}: ${sub.description?.slice(0, 80)}`));
      }
    });
  }
}

