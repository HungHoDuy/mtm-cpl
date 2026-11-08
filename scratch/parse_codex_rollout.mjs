import fs from 'fs';
import readline from 'readline';

const rolloutPath = 'C:/Users/ADMIN/.codex/sessions/2026/11/04/rollout-2026-11-04T14-56-24-01a1a58f-2525-7ea3-afd0-54d40ff33f97.jsonl';

async function run() {
  const fileStream = fs.createReadStream(rolloutPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const timeline = [];
  let modelInfo = null;

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      const { timestamp, type, payload } = obj;

      if (type === 'session_meta') {
        modelInfo = payload;
      }

      if (payload?.type === 'function_call' || payload?.name || payload?.call_id) {
        timeline.push({
          timestamp,
          kind: 'call',
          name: payload.name || payload.function?.name,
          arguments: payload.arguments || payload.function?.arguments
        });
      } else if (payload?.type === 'function_call_output' || payload?.output) {
        timeline.push({
          timestamp,
          kind: 'output',
          call_id: payload.call_id,
          output: typeof payload.output === 'string' ? payload.output.slice(0, 300) : JSON.stringify(payload.output || '').slice(0, 300)
        });
      } else if (payload?.role === 'assistant' && payload?.content) {
        // assistant message
        const text = typeof payload.content === 'string' ? payload.content : JSON.stringify(payload.content);
        if (text.includes('BUG-02') || text.includes('PI-01') || text.includes('preempt') || text.includes('error')) {
          timeline.push({
            timestamp,
            kind: 'assistant',
            text: text.slice(0, 200)
          });
        }
      }
    } catch (_) {}
  }

  console.log('Model info:', JSON.stringify(modelInfo, null, 2));
  console.log(`Extracted ${timeline.length} timeline events.`);
  fs.writeFileSync('d:/mtm/scratch/ytfhp47k_timeline.json', JSON.stringify(timeline, null, 2));

  // Print first 40 events
  console.log('--- Sample Events ---');
  for (const item of timeline.slice(0, 50)) {
    console.log(`[${item.timestamp}] ${item.kind} ${item.name || ''}: ${(item.arguments || item.output || item.text || '').slice(0, 150)}`);
  }
}

run().catch(console.error);

