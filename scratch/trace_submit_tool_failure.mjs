import fs from 'fs';
import readline from 'readline';

const filePath = 'C:/Users/ADMIN/.codex/sessions/2026/11/06/rollout-2026-11-06T11-32-13-01a1af20-e95b-7841-9caf-cc9df6f3f714.jsonl';
const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

let found = [];

rl.on('line', (line) => {
  try {
    const obj = JSON.parse(line);
    const time = obj.created_at || obj.timestamp;
    if (time >= '2026-11-06T05:12:00Z' && time <= '2026-11-06T05:15:30Z') {
      const p = obj.payload;
      if (p) {
        found.push({
          time,
          type: obj.type || p.type,
          role: p.role,
          name: p.name,
          input: p.input,
          output: p.output,
          summary: p.summary,
          content: p.content
        });
      }
    }
  } catch {}
});

rl.on('close', () => {
  console.log(`Found ${found.length} records in window 05:12 to 05:15:30`);
  for (let i = 0; i < found.length; i++) {
    const f = found[i];
    console.log(`\n[#${i}] [${f.time}] Type: ${f.type} | Role: ${f.role || ''} | Name: ${f.name || ''}`);
    if (f.summary) console.log('Thinking summary:', f.summary);
    if (f.content) console.log('Content:', JSON.stringify(f.content).slice(0, 300));
    if (f.input) console.log('Input:', (typeof f.input === 'string' ? f.input : JSON.stringify(f.input)).slice(0, 300));
    if (f.output) console.log('Output:', (typeof f.output === 'string' ? f.output : JSON.stringify(f.output)).slice(0, 300));
  }
});

