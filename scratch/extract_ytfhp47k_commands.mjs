import fs from 'fs';
import readline from 'readline';

const rolloutPath = 'C:/Users/ADMIN/.codex/sessions/2026/11/04/rollout-2026-11-04T14-56-24-01a1a58f-2525-7ea3-afd0-54d40ff33f97.jsonl';

async function run() {
  const fileStream = fs.createReadStream(rolloutPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const calls = new Map();
  const outputs = new Map();

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      const { timestamp, payload } = obj;

      if (payload?.type === 'custom_tool_call') {
        calls.set(payload.call_id, {
          timestamp,
          call_id: payload.call_id,
          input: payload.input
        });
      } else if (payload?.type === 'custom_tool_call_output') {
        let text = '';
        if (Array.isArray(payload.output)) {
          text = payload.output.map(o => o.text || '').join('\n');
        } else if (typeof payload.output === 'string') {
          text = payload.output;
        } else {
          text = JSON.stringify(payload.output || '');
        }
        outputs.set(payload.call_id, {
          timestamp,
          output: text
        });
      }
    } catch (_) {}
  }

  const entries = [];
  for (const [callId, call] of calls.entries()) {
    const out = outputs.get(callId);
    entries.push({
      callId,
      time: call.timestamp,
      input: call.input,
      output: out ? out.output : null
    });
  }

  console.log(`Matched ${entries.length} tool calls with outputs.`);
  fs.writeFileSync('d:/mtm/scratch/ytfhp47k_commands.json', JSON.stringify(entries, null, 2));

  // Print a summary of all commands
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const previewIn = e.input ? e.input.trim().replace(/\r?\n/g, ' ').slice(0, 150) : '';
    const previewOut = e.output ? e.output.trim().replace(/\r?\n/g, ' ').slice(0, 150) : '';
    console.log(`[#${i + 1} | ${e.time}] ${previewIn}`);
    if (previewOut.includes('error') || previewOut.includes('FAIL') || previewOut.includes('Exit code') || previewOut.includes('Exception') || previewOut.includes('PREEMPTION')) {
      console.log(`    >>> OUT: ${previewOut.slice(0, 140)}`);
    }
  }
}

run().catch(console.error);

