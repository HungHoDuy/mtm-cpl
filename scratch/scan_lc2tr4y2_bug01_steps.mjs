import fs from 'fs';
import readline from 'readline';

async function scan() {
  const stream = fs.createReadStream('C:/Users/ADMIN/.codex/sessions/2026/11/02/rollout-2026-11-02T16-18-56-01a19b8d-fc86-75a1-bdb6-7c6e2b873ede.jsonl');
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;
    const obj = JSON.parse(line);
    const ts = obj.timestamp;
    if (ts >= '2026-11-02T09:34:34.000Z' && ts <= '2026-11-02T09:43:00.000Z') {
      const p = obj.payload;
      if (obj.type === 'response_item') {
        if (p?.type === 'custom_tool_call') {
          console.log(`[${ts}] TOOL: ${p.name}`);
          const s = JSON.stringify(p.input);
          console.log(`  INPUT: ${s.slice(0, 160)}`);
        } else if (p?.role === 'assistant') {
          const txt = p.content?.map(c => c.text).filter(Boolean).join(' ') || '';
          if (txt) console.log(`[${ts}] ASSISTANT: ${txt.slice(0, 200)}`);
        }
      } else if (p?.type === 'custom_tool_call_output') {
        const out = typeof p.output === 'string' ? p.output : JSON.stringify(p.output);
        if (out.includes('Error') || out.includes('error') || out.includes('fail') || out.includes('Timeout') || out.includes('timeout')) {
          console.log(`[${ts}] OUTPUT ERROR: ${out.slice(0, 200)}`);
        }
      }
    }
  }
}
scan();

