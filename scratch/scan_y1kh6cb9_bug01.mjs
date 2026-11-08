import fs from 'fs';
import readline from 'readline';

async function scan() {
  const stream = fs.createReadStream('C:/Users/ADMIN/.codex/sessions/2026/11/02/rollout-2026-11-02T13-41-03-01a19afd-6d43-7fc0-bc01-9e231904cdd7.jsonl');
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;
    const obj = JSON.parse(line);
    const ts = obj.timestamp;
    if (ts >= '2026-11-02T06:51:00.000Z' && ts <= '2026-11-02T06:58:30.000Z') {
      const p = obj.payload;
      if (obj.type === 'response_item') {
        if (p?.type === 'custom_tool_call') {
          const inputStr = JSON.stringify(p.input);
          console.log(`[${ts}] TOOL: ${p.name} -> ${inputStr.slice(0, 160)}`);
        } else if (p?.role === 'assistant') {
          const txt = p.content?.map(c => c.text).filter(Boolean).join(' ') || '';
          if (txt) console.log(`[${ts}] ASSISTANT: ${txt.slice(0, 200)}...`);
        }
      }
    }
  }
}
scan();

