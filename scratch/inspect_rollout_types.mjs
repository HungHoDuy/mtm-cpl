import fs from 'fs';
import readline from 'readline';

const stream = fs.createReadStream('C:/Users/ADMIN/.codex/sessions/2026/11/02/rollout-2026-11-02T16-18-56-01a19b8d-fc86-75a1-bdb6-7c6e2b873ede.jsonl');
const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

let lineIdx = 0;
for await (const line of rl) {
  lineIdx++;
  const parsed = JSON.parse(line);
  console.log(`Line ${lineIdx}: type=${parsed.type}, payloadKeys=${Object.keys(parsed.payload || {})}`);
  if (lineIdx >= 10) break;
}

