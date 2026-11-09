import fs from 'node:fs';
import readline from 'node:readline';

const files = [
  'C:\\Users\\ADMIN\\.codex\\sessions\\2026\\11\\08\\rollout-2026-11-08T23-58-24-01a1bc18-cd60-7580-ae8b-a76a178d1c57.jsonl',
  'C:\\Users\\ADMIN\\.codex\\sessions\\2026\\11\\09\\rollout-2026-11-09T00-04-58-01a1bc1e-cfc2-78c2-9b49-fb48155e2d87.jsonl',
  'C:\\Users\\ADMIN\\.codex\\sessions\\2026\\11\\09\\rollout-2026-11-09T00-04-58-01a1bc1e-cf07-7f52-8297-666918439d79.jsonl',
  'C:\\Users\\ADMIN\\.codex\\sessions\\2026\\11\\09\\rollout-2026-11-09T00-04-03-01a1bc1d-f8c4-7131-b444-77d887ef8369.jsonl',
  'C:\\Users\\ADMIN\\.codex\\sessions\\2026\\11\\08\\rollout-2026-11-08T23-58-24-01a1bc18-cdfb-7771-90eb-cc0a9cd070f6.jsonl'
];

async function scanRollout(filePath) {
  console.log('=== Scanning', filePath, '===');
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity
  });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    try {
      const obj = JSON.parse(line);
      // Check for tool calls or errors
      const str = JSON.stringify(obj);
      if (str.includes('submit_task') || str.includes('submit_work') || str.includes('prepare_task_workspace') || str.includes('spawn_agent') || str.includes('start_work')) {
        // extract tool call details
        console.log(`Line ${lineNum}: type=${obj.type || obj.event || 'item'}`);
        if (obj.tool_calls) {
          obj.tool_calls.forEach(tc => {
            console.log(`  TOOL CALL: ${tc.function?.name || tc.name} args:`, JSON.stringify(tc.function?.arguments || tc.args || {}).slice(0, 150));
          });
        }
        if (obj.content && typeof obj.content === 'string') {
          // check if content has error or tool call
          if (obj.content.includes('error') || obj.content.includes('fail') || obj.content.includes('Error')) {
            console.log(`  CONTENT:`, obj.content.slice(0, 200));
          }
        }
        if (obj.error) {
          console.log(`  ERROR:`, JSON.stringify(obj.error));
        }
      }
    } catch (_) {}
  }
}

async function main() {
  for (const f of files.slice(0, 3)) {
    if (fs.existsSync(f)) {
      await scanRollout(f);
    }
  }
}

main().catch(console.error);

