import fs from 'fs';
import readline from 'readline';

const rolloutPath = 'C:/Users/ADMIN/.codex/sessions/2026/11/04/rollout-2026-11-04T14-56-24-01a1a58f-2525-7ea3-afd0-54d40ff33f97.jsonl';

async function analyze() {
  const fileStream = fs.createReadStream(rolloutPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  let model = null;
  const toolCalls = [];

  for await (const line of rl) {
    lineCount++;
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      if (entry.model && !model) model = entry.model;
      if (entry.payload?.model && !model) model = entry.payload.model;

      // check tool calls or commands
      if (entry.type === 'tool_call' || entry.name || entry.tool_calls || entry.role === 'assistant') {
        const text = JSON.stringify(entry);
        if (text.includes('BUG-02') || text.includes('PI-01') || text.includes('preempt') || text.includes('start_work')) {
          toolCalls.push({
            line: lineCount,
            type: entry.type || entry.role,
            timestamp: entry.timestamp || entry.created_at || entry.time,
            summary: text.slice(0, 300)
          });
        }
      }
    } catch (_) {}
  }

  console.log(`Read ${lineCount} lines.`);
  console.log('Model identified:', model);
  console.log(`Found ${toolCalls.length} relevant entries.`);
  for (const tc of toolCalls.slice(0, 30)) {
    console.log(`[Line ${tc.line}] ${tc.timestamp || ''}: ${tc.summary}`);
  }
}

analyze().catch(console.error);

