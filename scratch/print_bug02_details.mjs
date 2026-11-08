import fs from 'fs';

const p1 = 'C:/Users/ADMIN/.codex/sessions/2026/11/05/rollout-2026-11-05T10-30-01-01a1a9c1-9fac-7ed2-8e64-95bf01297611.jsonl';
const lines1 = fs.readFileSync(p1, 'utf8').trim().split('\n').map(l => JSON.parse(l));

console.log('--- SESSION 1: Lines 308 to 360 ---');
for (let i = 308; i <= 360 && i < lines1.length; i++) {
  const l = lines1[i];
  if (l.type === 'response_item') {
    const p = l.payload;
    if (p.type === 'message' && p.role === 'assistant') {
      console.log(`\n[${i}] ASST:`, p.content?.[0]?.text);
    } else if (p.type === 'custom_tool_call') {
      console.log(`\n[${i}] CALL ${p.name}:`, p.input);
    } else if (p.type === 'custom_tool_call_output') {
      console.log(`\n[${i}] OUTPUT:`, p.output);
    }
  }
}
