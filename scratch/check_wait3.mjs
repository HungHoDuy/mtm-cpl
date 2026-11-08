import fs from 'node:fs';
import readline from 'node:readline';

async function main() {
  const file = 'C:/Users/ADMIN/.codex/sessions/2026/11/05/rollout-2026-11-05T11-19-32-01a1a9ee-f607-7451-8bce-f336e3166980.jsonl';
  const rl = readline.createInterface({ input: fs.createReadStream(file) });
  for await (const line of rl) {
    if (line.includes('cell ID 4') || line.includes('\"cell_id\":\"4\"')) {
      console.log(line.slice(0, 300));
    }
  }
}
main();

