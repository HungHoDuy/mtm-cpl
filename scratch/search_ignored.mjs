import fs from 'fs';
import readline from 'readline';

async function search() {
  const fileStream = fs.createReadStream('C:/Users/ADMIN/.codex/sessions/2026/11/05/rollout-2026-11-05T01-13-35-01a1a7c4-3345-7bf2-a5e9-3b165b4f97b3.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.includes('ignored') || line.includes('git add -f') || line.includes('.git/info/exclude')) {
      const parsed = JSON.parse(line);
      console.log('--- ORDINAL ---', parsed.ordinal);
      if (parsed.payload && parsed.payload.content) {
        console.log(JSON.stringify(parsed.payload.content).slice(0, 300));
      } else if (parsed.payload && parsed.payload.item) {
        console.log(JSON.stringify(parsed.payload.item).slice(0, 300));
      } else if (parsed.payload && parsed.payload.input) {
        console.log(JSON.stringify(parsed.payload.input).slice(0, 300));
      }
    }
  }
}
search();

