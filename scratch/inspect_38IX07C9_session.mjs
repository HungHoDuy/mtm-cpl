import fs from 'fs';

const p = 'C:/Users/ADMIN/.codex/sessions/2026/11/05/rollout-2026-11-05T11-19-32-01a1a9ee-f607-7451-8bce-f336e3166980.jsonl';
const lines = fs.readFileSync(p, 'utf8').trim().split('\n').map(l => JSON.parse(l));

console.log('Total lines in 38IX07C9 session:', lines.length);

for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (l.type === 'response_item') {
    const pl = l.payload;
    if (pl.type === 'custom_tool_call') {
      console.log(`[${i}] CALL: ${pl.name} -> ${(pl.input || '').slice(0, 140)}`);
    } else if (pl.type === 'message' && pl.role === 'assistant') {
      const text = pl.content?.[0]?.text || '';
      console.log(`[${i}] ASST: ${text.slice(0, 100)}`);
    }
  }
}

