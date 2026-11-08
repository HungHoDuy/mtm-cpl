import fs from 'fs';
import readline from 'readline';

const filePath = 'C:/Users/ADMIN/.codex/sessions/2026/11/06/rollout-2026-11-06T11-32-13-01a1af20-e95b-7841-9caf-cc9df6f3f714.jsonl';
const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

const calls = [];
rl.on('line', (line) => {
  try {
    const obj = JSON.parse(line);
    const p = obj.payload;
    if (p?.type === 'custom_tool_call') {
      calls.push({ type: 'call', name: p.name, input: p.input, id: p.call_id });
    } else if (p?.type === 'custom_tool_call_output') {
      calls.push({ type: 'output', id: p.call_id, output: p.output });
    }
  } catch {}
});

rl.on('close', () => {
  console.log('Total tool events:', calls.length);
  const recent = calls.slice(-8);
  for (const c of recent) {
    if (c.type === 'call') {
      console.log(`\n>>> CALL [${c.name}]: ${typeof c.input === 'string' ? c.input.slice(0, 200) : JSON.stringify(c.input).slice(0, 200)}`);
    } else {
      console.log(`<<< OUTPUT: ${typeof c.output === 'string' ? c.output.slice(0, 300) : JSON.stringify(c.output).slice(0, 300)}`);
    }
  }
});
