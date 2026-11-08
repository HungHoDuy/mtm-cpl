import fs from 'fs';
import readline from 'readline';

const rolloutPath = 'C:/Users/ADMIN/.codex/sessions/2026/11/04/rollout-2026-11-04T14-56-24-01a1a58f-2525-7ea3-afd0-54d40ff33f97.jsonl';

async function run() {
  const fileStream = fs.createReadStream(rolloutPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const events = [];
  let currentCall = null;

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      const { timestamp, payload } = obj;

      if (payload?.type === 'function_call' || payload?.name === 'exec' || payload?.call_id) {
        let args = payload.arguments;
        if (typeof args === 'string') {
          try { args = JSON.parse(args); } catch (_) {}
        }
        currentCall = {
          timestamp,
          call_id: payload.call_id,
          name: payload.name || payload.function?.name,
          command: args?.command || args?.cmd || JSON.stringify(args)
        };
        events.push(currentCall);
      } else if (payload?.type === 'function_call_output') {
        const out = payload.output;
        events.push({
          timestamp,
          kind: 'output',
          call_id: payload.call_id,
          output: typeof out === 'string' ? out : JSON.stringify(out)
        });
      }
    } catch (_) {}
  }

  console.log(`Total events: ${events.length}`);
  fs.writeFileSync('d:/mtm/scratch/ytfhp47k_exec_events.json', JSON.stringify(events, null, 2));

  // Print all commands executed
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev.command) {
      // Find following output
      const nextOut = events.slice(i + 1, i + 3).find(e => e.kind === 'output' && (!e.call_id || e.call_id === ev.call_id));
      const outPreview = nextOut?.output ? nextOut.output.trim().replace(/\r?\n/g, ' ').slice(0, 160) : '';
      console.log(`[${ev.timestamp}] CMD: ${ev.command.slice(0, 120)} | OUT: ${outPreview}`);
    }
  }
}

run().catch(console.error);

