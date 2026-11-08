import fs from 'fs';
import readline from 'readline';

async function search() {
  const fileStream = fs.createReadStream('C:/Users/ADMIN/.codex/sessions/2026/11/05/rollout-2026-11-05T01-13-35-01a1a7c4-3345-7bf2-a5e9-3b165b4f97b3.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.includes('"ordinal":372')) {
      const parsed = JSON.parse(line);
      console.log('FULL COMMAND 372:');
      console.log(parsed.payload.item.command.join(' '));
    }
  }
}
search();

