import fs from 'fs';
import readline from 'readline';

const stream = fs.createReadStream('C:/Users/ADMIN/.codex/sessions/2026/11/02/rollout-2026-11-02T09-58-38-01a19a31-cea8-7781-99f6-b7bddf7b89a1.jsonl');
const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

async function run() {
  const logEntries = [];
  let count = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    count++;
    const obj = JSON.parse(line);
    const ts = obj.timestamp;
    if (obj.type === 'response_item') {
      const p = obj.payload;
      if (p?.type === 'message' && p?.role === 'assistant') {
        const text = p.content?.map(c => c.text).filter(Boolean).join(' ');
        if (text) logEntries.push({ time: ts, type: 'assistant', text: text.slice(0, 300) });
      } else if (p?.type === 'custom_tool_call') {
        logEntries.push({ time: ts, type: 'tool_call', name: p.name, input: p.input });
      } else if (p?.type === 'message' && p?.role === 'user') {
        const text = p.content?.map(c => c.text).filter(Boolean).join(' ');
        if (text && !text.includes('AGENTS.md')) {
          logEntries.push({ time: ts, type: 'user', text: text.slice(0, 300) });
        }
      }
    }
  }

  console.log(`Parsed ${count} lines, collected ${logEntries.length} log entries.`);
  fs.writeFileSync('d:/mtm/scratch/codex_timeline.json', JSON.stringify(logEntries, null, 2));
  console.log('Saved to d:/mtm/scratch/codex_timeline.json');
}

run().catch(console.error);
