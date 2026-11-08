import fs from 'fs';

const p1 = 'C:/Users/ADMIN/.codex/sessions/2026/11/05/rollout-2026-11-05T10-30-01-01a1a9c1-9fac-7ed2-8e64-95bf01297611.jsonl';
const lines1 = fs.readFileSync(p1, 'utf8').trim().split('\n').map(l => JSON.parse(l));

console.log('--- Lines 160 to 250: Planning BUG-02 ---');
for (let i = 160; i <= 250; i++) {
  const l = lines1[i];
  if (l.type === 'response_item') {
    const p = l.payload;
    if (p.type === 'reasoning') {
      const summary = p.summary || [];
      const text = summary.map(s => s.text).join('\n') || JSON.stringify(p);
      console.log(`\n[${i}] REASONING:\n${text}`);
    } else if (p.type === 'message' && p.role === 'assistant') {
      console.log(`\n[${i}] ASST:\n${p.content?.[0]?.text}`);
    } else if (p.type === 'custom_tool_call') {
      console.log(`\n[${i}] CALL ${p.name}: ${(p.input || '').slice(0, 200)}`);
    }
  }
}

