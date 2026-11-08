import fs from 'fs';

const rolloutPath = 'C:/Users/ADMIN/.codex/sessions/2026/11/04/rollout-2026-11-04T19-37-08-01a1a690-2a91-7b30-90b4-7be65bad53c1.jsonl';
const lines = fs.readFileSync(rolloutPath, 'utf8').split('\n').filter(Boolean);

const callsById = {};
const callList = [];

for (const line of lines) {
  try {
    const entry = JSON.parse(line);
    const payload = entry.payload;
    if (!payload) continue;

    if (entry.type === 'response_item') {
      if (payload.type === 'custom_tool_call') {
        const id = payload.call_id || payload.id;
        const callObj = {
          callId: id,
          ts: entry.timestamp,
          name: payload.name,
          input: payload.input,
          output: null
        };
        callsById[id] = callObj;
        callList.push(callObj);
      } else if (payload.type === 'custom_tool_call_output') {
        const id = payload.call_id;
        if (callsById[id]) {
          const out = payload.output;
          if (Array.isArray(out)) {
            callsById[id].output = out.map(o => o.text || JSON.stringify(o)).join('\n');
          } else {
            callsById[id].output = typeof out === 'string' ? out : JSON.stringify(out);
          }
        }
      }
    }
  } catch (e) {}
}

console.log('Total calls paired:', callList.length);

callList.forEach((c, i) => {
  if (i >= 80 && i <= 120) {
    console.log(`\n=================== [${i}] ${c.ts} | ${c.name} ===================`);
    console.log('INPUT:', typeof c.input === 'string' ? c.input : JSON.stringify(c.input));
    console.log('OUTPUT:', c.output ? c.output.slice(0, 500) : 'NO OUTPUT');
  }
});
