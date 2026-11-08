import fs from 'fs';
import readline from 'readline';

const stream = fs.createReadStream('C:/Users/ADMIN/.codex/sessions/2026/11/02/rollout-2026-11-02T13-41-03-01a19afd-6d43-7fc0-bc01-9e231904cdd7.jsonl');
const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

for await (const line of rl) {
  if (!line.trim()) continue;
  const obj = JSON.parse(line);
  const ts = obj.timestamp;
  if (ts >= '2026-11-02T06:47:25.000Z' && ts <= '2026-11-02T06:47:35.000Z') {
    if (obj.payload?.type === 'custom_tool_call_output') {
      console.log('OUTPUT at', ts);
      console.log(JSON.stringify(obj.payload.output, null, 2));
    }
  }
}

