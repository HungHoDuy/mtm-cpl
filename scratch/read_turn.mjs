import fs from 'fs';
import readline from 'readline';

async function search() {
  const fileStream = fs.createReadStream('C:/Users/ADMIN/.codex/sessions/2026/11/05/rollout-2026-11-05T08-09-21-01a1a940-d749-7b33-8823-de06f535d575.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.includes('"ordinal":403') || line.includes('"ordinal":404') || line.includes('"ordinal":405')) {
      const parsed = JSON.parse(line);
      console.log('--- ORDINAL ---', parsed.ordinal);
      console.log(JSON.stringify(parsed, null, 2).slice(0, 1000));
    }
  }
}
search();

