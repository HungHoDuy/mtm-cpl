import fs from 'fs';
import readline from 'readline';

async function search() {
  const fileStream = fs.createReadStream('C:/Users/ADMIN/.codex/sessions/2026/11/05/rollout-2026-11-05T01-13-35-01a1a7c4-3345-7bf2-a5e9-3b165b4f97b3.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.includes('"ordinal":355') || line.includes('"ordinal":360') || line.includes('"ordinal":365') || line.includes('"ordinal":368') || line.includes('"ordinal":370')) {
      const parsed = JSON.parse(line);
      console.log('--- ORDINAL ---', parsed.ordinal);
      if (parsed.payload && parsed.payload.content) {
        console.log('CONTENT:', JSON.stringify(parsed.payload.content).slice(0, 500));
      }
      if (parsed.payload && parsed.payload.input) {
        console.log('INPUT:', JSON.stringify(parsed.payload.input).slice(0, 500));
      }
    }
  }
}
search();

