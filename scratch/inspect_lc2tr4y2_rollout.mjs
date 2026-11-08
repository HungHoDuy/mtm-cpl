import fs from 'fs';
import readline from 'readline';

async function parseRollout(path, outName) {
  const stream = fs.createReadStream(path);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
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
        if (text) logEntries.push({ time: ts, type: 'assistant', text });
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

  console.log(`${outName}: Parsed ${count} lines, collected ${logEntries.length} log entries.`);
  fs.writeFileSync(`d:/mtm/scratch/${outName}.json`, JSON.stringify(logEntries, null, 2));
}

await parseRollout('C:/Users/ADMIN/.codex/sessions/2026/11/02/rollout-2026-11-02T16-18-56-01a19b8d-fc86-75a1-bdb6-7c6e2b873ede.jsonl', 'lc2tr4y2_rollout_1');
await parseRollout('C:/Users/ADMIN/.codex/sessions/2026/11/02/rollout-2026-11-02T16-18-56-01a19b8d-fde7-75c1-a52e-c5e6fad2d259.jsonl', 'lc2tr4y2_rollout_2');

