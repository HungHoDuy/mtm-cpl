import fs from 'fs';
import readline from 'readline';

const files = [
  'C:/Users/ADMIN/.codex/sessions/2026/11/04/rollout-2026-11-04T10-24-01-01a1a495-c76d-7d33-9cbf-1dc0e426f813.jsonl',
  'C:/Users/ADMIN/.codex/sessions/2026/11/04/rollout-2026-11-04T10-24-02-01a1a495-c91c-77b2-b3ea-c08e6687a46f.jsonl'
];

async function parseRollout(file) {
  const stream = fs.createReadStream(file);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const entries = [];

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      const ts = obj.timestamp;
      if (obj.type === 'response_item') {
        const p = obj.payload;
        if (p?.type === 'custom_tool_call') {
          entries.push({ time: ts, type: 'tool_call', name: p.name, input: p.input });
        } else if (p?.type === 'message' && p?.role === 'assistant') {
          const text = p.content?.map(c => c.text).filter(Boolean).join(' ');
          if (text) {
            entries.push({ time: ts, type: 'assistant', text: text.slice(0, 300) });
          }
        } else if (p?.type === 'message' && p?.role === 'user') {
          const text = p.content?.map(c => c.text).filter(Boolean).join(' ');
          if (text && !text.includes('AGENTS.md') && text.length > 5) {
            entries.push({ time: ts, type: 'user', text: text.slice(0, 300) });
          }
        }
      }
    } catch {}
  }
  return entries;
}

async function run() {
  const allEntries = [];
  for (const f of files) {
    const e = await parseRollout(f);
    console.log(`Parsed ${f}: ${e.length} entries`);
    allEntries.push(...e);
  }

  allEntries.sort((a, b) => new Date(a.time) - new Date(b.time));
  fs.writeFileSync('d:/mtm/scratch/dxnkocpq_timeline.json', JSON.stringify(allEntries, null, 2));
  console.log(`Total sorted entries: ${allEntries.length}`);

  // Summary of tool calls
  const toolCounts = {};
  for (const item of allEntries) {
    if (item.type === 'tool_call') {
      toolCounts[item.name] = (toolCounts[item.name] || 0) + 1;
    }
  }
  console.log('Tool counts:', toolCounts);
}

run().catch(console.error);

