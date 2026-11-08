import fs from 'fs';
import readline from 'readline';

const filePath = 'C:/Users/ADMIN/.codex/sessions/2026/11/06/rollout-2026-11-06T11-32-13-01a1af20-e95b-7841-9caf-cc9df6f3f714.jsonl';
const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

const events = [];

rl.on('line', (line) => {
  try {
    const obj = JSON.parse(line);
    const p = obj.payload;
    if (!p) return;
    const time = obj.created_at || obj.timestamp;
    
    if (p.type === 'custom_tool_call') {
      events.push({
        time,
        type: 'CALL',
        name: p.name,
        input: typeof p.input === 'string' ? p.input : JSON.stringify(p.input),
        call_id: p.call_id
      });
    } else if (p.type === 'custom_tool_call_output') {
      events.push({
        time,
        type: 'OUTPUT',
        output: typeof p.output === 'string' ? p.output : JSON.stringify(p.output),
        call_id: p.call_id
      });
    } else if (p.type === 'reasoning') {
      events.push({
        time,
        type: 'THINKING',
        summary: p.summary
      });
    }
  } catch (err) {}
});

rl.on('close', () => {
  console.log('Total events in session:', events.length);
  fs.writeFileSync('d:/mtm/scratch/codex_events_parsed.json', JSON.stringify(events, null, 2));

  // Let's summarize the flow
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.type === 'CALL') {
      // Print interesting calls
      let summary = '';
      if (e.input.includes('get_next_task')) summary = '>>> GET_NEXT_TASK';
      else if (e.input.includes('deliver.mjs')) summary = '>>> DELIVER: ' + e.input.match(/deliver\.mjs\s+([A-Z0-9-]+)/)?.[0];
      else if (e.input.includes('git commit')) summary = '>>> GIT COMMIT: ' + e.input.slice(0, 80);
      else if (e.input.includes('report_progress')) summary = '>>> REPORT_PROGRESS: ' + e.input.slice(0, 80);
      else if (e.input.includes('yarn install')) summary = '>>> YARN INSTALL';
      else if (e.input.includes('CR-07')) summary = '>>> CR-07 touched: ' + e.input.slice(0, 100);
      else if (e.input.includes('TASK-07')) summary = '>>> TASK-07 touched: ' + e.input.slice(0, 100);
      else if (e.input.includes('vitest')) summary = '>>> VITEST: ' + e.input.slice(0, 100);
      
      if (summary) {
        console.log(`[${e.time}] ${summary}`);
      }
    }
  }
});

