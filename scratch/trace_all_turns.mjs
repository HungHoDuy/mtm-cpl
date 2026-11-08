import fs from 'fs';

const events = JSON.parse(fs.readFileSync('d:/mtm/scratch/codex_events_parsed.json', 'utf8'));

console.log('--- REASONING SUMMARIES ---');
for (const e of events) {
  if (e.type === 'THINKING') {
    console.log(`[${e.time}] THINKING: ${e.summary}`);
  }
}

