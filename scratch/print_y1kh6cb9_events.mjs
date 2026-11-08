import fs from 'fs';

const events = JSON.parse(fs.readFileSync('d:/mtm/scratch/y1kh6cb9_events.json', 'utf8'));

for (const e of events.slice(0, 40)) {
  const inputStr = typeof e.input === 'string' ? e.input : JSON.stringify(e.input || {});
  if (e.type === 'assistant') {
    console.log(`[${e.ts}] ASSISTANT: ${e.text}`);
  } else {
    console.log(`[${e.ts}] TOOL: ${e.name} -> ${inputStr.slice(0, 140)}`);
  }
}

