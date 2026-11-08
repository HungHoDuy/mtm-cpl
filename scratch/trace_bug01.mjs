import fs from 'fs';
import readline from 'readline';

async function main() {
  const ndjsonPath = 'D:/mtm/CPL/team-sdlc-pack/logs/38IX07C9.progress.ndjson';
  if (fs.existsSync(ndjsonPath)) {
    console.log('=== 38IX07C9.progress.ndjson for BUG-01 ===');
    const lines = fs.readFileSync(ndjsonPath, 'utf8').split(/\r?\n/).filter(Boolean);
    for (const l of lines) {
      if (l.includes('BUG-01')) {
        console.log(l);
      }
    }
  }

  const codexFile = 'C:/Users/ADMIN/.codex/sessions/2026/11/05/rollout-2026-11-05T11-19-32-01a1a9ee-f607-7451-8bce-f336e3166980.jsonl';
  console.log('\n=== Codex Session Log for BUG-01 preemption/start/submit ===');
  const rl = readline.createInterface({ input: fs.createReadStream(codexFile) });
  for await (const line of rl) {
    if (line.includes('BUG-01') && (line.includes('preempt') || line.includes('start_work') || line.includes('submit_work') || line.includes('stash') || line.includes('resume') || line.includes('custom_tool_call'))) {
      if (line.includes('name') || line.includes('input') || line.includes('summary')) {
        console.log(line.slice(0, 300));
      }
    }
  }
}

main().catch(console.error);

