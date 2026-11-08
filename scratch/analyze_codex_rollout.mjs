import fs from 'fs';
import readline from 'readline';

const filePath = 'C:/Users/ADMIN/.codex/sessions/2026/11/06/rollout-2026-11-06T11-32-13-01a1af20-e95b-7841-9caf-cc9df6f3f714.jsonl';
const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

const items = [];
let lineNo = 0;

rl.on('line', (line) => {
  lineNo++;
  try {
    const obj = JSON.parse(line);
    const p = obj.payload;
    if (!p) return;
    
    if (p.type === 'custom_tool_call') {
      items.push({
        time: obj.created_at || obj.timestamp,
        type: 'CALL',
        name: p.name,
        call_id: p.call_id,
        input: p.input
      });
    } else if (p.type === 'custom_tool_call_output') {
      items.push({
        time: obj.created_at || obj.timestamp,
        type: 'OUTPUT',
        call_id: p.call_id,
        output: p.output
      });
    } else if (p.type === 'reasoning' && p.summary) {
      items.push({
        time: obj.created_at || obj.timestamp,
        type: 'THINKING',
        summary: p.summary
      });
    }
  } catch (err) {}
});

rl.on('close', () => {
  console.log('Total parsed items:', items.length);
  // Scan for calls to mcp__mtm_helper or task-related calls
  const tasks = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.type === 'CALL') {
      const inpStr = typeof it.input === 'string' ? it.input : JSON.stringify(it.input);
      if (inpStr.includes('get_next_task') || inpStr.includes('start') || inpStr.includes('submit') || inpStr.includes('CR-07') || inpStr.includes('TASK-07') || inpStr.includes('PI-02') || inpStr.includes('PI-03')) {
        tasks.push({
          idx: i,
          time: it.time,
          name: it.name,
          preview: inpStr.slice(0, 200)
        });
      }
    }
  }
  console.log(`Found ${tasks.length} task-relevant calls:`);
  for (const t of tasks) {
    console.log(`[${t.time}] [${t.name}] ${t.preview}`);
  }
});

