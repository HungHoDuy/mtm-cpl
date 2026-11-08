import fs from 'fs';
import readline from 'readline';

async function inspectY1KH6CB9() {
  const file1 = 'C:/Users/ADMIN/.codex/sessions/2026/11/02/rollout-2026-11-02T13-41-03-01a19afd-6d43-7fc0-bc01-9e231904cdd7.jsonl';
  const file2 = 'C:/Users/ADMIN/.codex/sessions/2026/11/02/rollout-2026-11-02T13-41-04-01a19afd-73d4-7321-995f-481a9828f60d.jsonl';
  
  const targetFile = fs.existsSync(file1) ? file1 : file2;
  console.log('Reading:', targetFile);

  const stream = fs.createReadStream(targetFile);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let count = 0;
  const events = [];

  for await (const line of rl) {
    if (!line.trim()) continue;
    count++;
    try {
      const obj = JSON.parse(line);
      const ts = obj.timestamp;
      const p = obj.payload;
      if (p?.type === 'message' && p?.role === 'assistant') {
        const text = p.content?.map(c => c.text).filter(Boolean).join(' ');
        if (text && (text.includes('BUG-02') || text.includes('BUG-01') || text.includes('start') || text.includes('401') || text.includes('error'))) {
          events.push({ ts, type: 'assistant', text: text.slice(0, 200) });
        }
      } else if (p?.type === 'custom_tool_call') {
        events.push({ ts, type: 'tool', name: p.name, input: p.input });
      }
    } catch (e) {}
  }
  console.log(`Parsed ${count} lines, collected ${events.length} events`);
  fs.writeFileSync('d:/mtm/scratch/y1kh6cb9_events.json', JSON.stringify(events.slice(0, 80), null, 2));
}

await inspectY1KH6CB9();

