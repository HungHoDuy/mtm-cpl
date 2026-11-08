import fs from 'fs';

const p1 = 'C:/Users/ADMIN/.codex/sessions/2026/11/05/rollout-2026-11-05T10-30-01-01a1a9c1-9fac-7ed2-8e64-95bf01297611.jsonl';
const p2 = 'C:/Users/ADMIN/.codex/sessions/2026/11/05/rollout-2026-11-05T10-30-01-01a1a9c1-a14c-7aa2-8ca1-95665f3360d9.jsonl';

function inspectFile(filePath, name) {
  console.log(`\n================== ${name} ==================`);
  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  
  lines.forEach((l, i) => {
    // print user messages
    if (l.type === 'event' && l.payload?.type === 'user_message') {
      console.log(`[${i}] USER: ${l.payload.message || l.payload.content}`);
    }
    // print response items
    if (l.type === 'response_item') {
      const p = l.payload;
      if (p.type === 'function_call') {
        let args = p.arguments;
        try {
          const parsed = JSON.parse(args);
          if (parsed.command) args = parsed.command;
          else if (parsed.cmd) args = parsed.cmd;
          else args = JSON.stringify(parsed);
        } catch(e) {}
        console.log(`[${i}] CALL: ${p.name} -> ${args.slice(0, 120)}`);
      } else if (p.type === 'function_call_output') {
        const out = typeof p.output === 'string' ? p.output : JSON.stringify(p.output);
        if (out && (out.includes('error') || out.includes('FAIL') || out.includes('409') || out.includes('ECONNREFUSED') || out.includes('exit code'))) {
          console.log(`[${i}] OUTPUT_ERR: ${out.slice(0, 150)}`);
        }
      } else if (p.type === 'message' && p.role === 'assistant') {
        const text = p.content?.[0]?.text || '';
        if (text) {
          const firstLine = text.trim().split('\n')[0];
          console.log(`[${i}] ASST: ${firstLine.slice(0, 120)}`);
        }
      }
    }
  });
}

inspectFile(p1, 'SESSION 1 (984KB)');
inspectFile(p2, 'SESSION 2 (427KB)');

