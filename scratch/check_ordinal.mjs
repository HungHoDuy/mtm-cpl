import fs from 'node:fs';
import readline from 'node:readline';

async function getOutput() {
  const f = 'C:/Users/ADMIN/.codex/sessions/2026/11/09/rollout-2026-11-09T07-31-38-01a1bdb7-c064-7e50-8d59-27a03056da96.jsonl';
  const fileStream = fs.createReadStream(f);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.includes('"ordinal":439') || line.includes('"ordinal": 439')) {
      const obj = JSON.parse(line);
      console.log('Output for ordinal 439:');
      console.log(JSON.stringify(obj.payload?.output, null, 2));
      break;
    }
  }
}
getOutput();

