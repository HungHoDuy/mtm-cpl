import fs from 'fs';
import readline from 'readline';

async function scan() {
  const stream = fs.createReadStream('C:/Users/ADMIN/.codex/sessions/2026/11/02/rollout-2026-11-02T16-18-56-01a19b8d-fc86-75a1-bdb6-7c6e2b873ede.jsonl');
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;
    const obj = JSON.parse(line);
    const ts = obj.timestamp;
    if (ts >= '2026-11-02T09:31:10.000Z' && ts <= '2026-11-02T09:34:30.000Z') {
      const p = obj.payload;
      if (p?.type === 'custom_tool_call_output') {
        const out = typeof p.output === 'string' ? p.output : JSON.stringify(p.output);
        if (out.includes('Error') || out.includes('error') || out.includes('fail') || out.includes('Timeout') || out.includes('timeout')) {
          console.log(`[${ts}] OUTPUT ERROR: ${out.slice(0, 300)}`);
        }
      }
    }
  }
}
scan();

