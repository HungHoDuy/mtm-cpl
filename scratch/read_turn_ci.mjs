import fs from 'fs';
import readline from 'readline';

async function search() {
  const fileStream = fs.createReadStream('C:/Users/ADMIN/.codex/sessions/2026/11/05/rollout-2026-11-05T01-13-35-01a1a7c4-3345-7bf2-a5e9-3b165b4f97b3.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.includes('"ordinal":372') || line.includes('"ordinal":373') || line.includes('"ordinal":374') || line.includes('"ordinal":375') || line.includes('"ordinal":849')) {
      const parsed = JSON.parse(line);
      console.log('--- ORDINAL ---', parsed.ordinal);
      console.log(JSON.stringify(parsed, null, 2).slice(0, 1000));
    }
  }
}
search();

