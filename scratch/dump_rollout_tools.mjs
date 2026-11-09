import fs from 'node:fs';
import readline from 'node:readline';

const filePath = 'C:\\Users\\ADMIN\\.codex\\sessions\\2026\\11\\09\\rollout-2026-11-09T00-04-58-01a1bc1e-cf07-7f52-8297-666918439d79.jsonl';

async function dumpTools() {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity
  });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    try {
      const obj = JSON.parse(line);
      // Look for function calls or tool outputs
      if (obj.payload?.name || obj.payload?.arguments || obj.payload?.output) {
        console.log(`\n--- Line ${lineNum} [${obj.type}] ---`);
        if (obj.payload.name) console.log('Tool Name:', obj.payload.name);
        if (obj.payload.arguments) console.log('Arguments:', obj.payload.arguments.slice(0, 300));
        if (obj.payload.output) console.log('Output:', obj.payload.output.slice(0, 300));
      } else if (obj.item?.type === 'function_call' || obj.item?.type === 'function_call_output') {
        console.log(`\n--- Line ${lineNum} Item [${obj.item.type}] ---`);
        if (obj.item.name) console.log('Tool Name:', obj.item.name);
        if (obj.item.arguments) console.log('Arguments:', obj.item.arguments.slice(0, 300));
        if (obj.item.output) console.log('Output:', obj.item.output.slice(0, 300));
      } else if (obj.role === 'assistant' && obj.content) {
        // Assistant text
        // console.log(`\n--- Line ${lineNum} Assistant:`, obj.content.slice(0, 150));
      }
    } catch (_) {}
  }
}

dumpTools().catch(console.error);

