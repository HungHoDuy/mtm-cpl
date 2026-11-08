import fs from 'fs';
import readline from 'readline';

async function main() {
  const codexFile = 'C:/Users/ADMIN/.codex/sessions/2026/11/05/rollout-2026-11-05T11-19-32-01a1a9ee-f607-7451-8bce-f336e3166980.jsonl';
  const rl = readline.createInterface({ input: fs.createReadStream(codexFile) });
  for await (const line of rl) {
    if (line.includes('start_work') || line.includes('preempt') || line.includes('stash') || line.includes('BUG-01')) {
      if (line.includes('custom_tool_call') || line.includes('function_call')) {
        console.log(line.slice(0, 300));
      }
    }
  }
}

main().catch(console.error);

