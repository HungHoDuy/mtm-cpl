import fs from 'fs';
import readline from 'readline';

async function main() {
  const codexFile = 'C:/Users/ADMIN/.codex/sessions/2026/11/05/rollout-2026-11-05T11-19-32-01a1a9ee-f607-7451-8bce-f336e3166980.jsonl';
  const rl = readline.createInterface({ input: fs.createReadStream(codexFile) });
  for await (const line of rl) {
    const obj = JSON.parse(line);
    if (obj.ordinal >= 508 && obj.ordinal <= 520) {
      console.log(`ORDINAL ${obj.ordinal} [${obj.payload?.name || obj.type}]:`);
      console.log(JSON.stringify(obj.payload || obj, null, 2));
    }
  }
}

main().catch(console.error);

