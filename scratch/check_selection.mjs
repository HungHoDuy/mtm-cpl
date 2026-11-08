import fs from 'node:fs';
import readline from 'node:readline';

const rolloutPath = 'C:\\Users\\ADMIN\\.codex\\sessions\\2026\\11\\02\\rollout-2026-11-02T13-41-04-01a19afd-73d4-7321-995f-481a9828f60d.jsonl';

async function search() {
  const fileStream = fs.createReadStream(rolloutPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (line.includes('BUG-03') || line.includes('refresh_match')) {
      const parsed = JSON.parse(line);
      const str = JSON.stringify(parsed);
      if (str.includes('refresh_match') || str.includes('BUG-03')) {
        console.log(`=== Line ${lineNum} (${parsed.type}) ===`);
        if (parsed.payload) {
          const payloadStr = JSON.stringify(parsed.payload);
          // Print snippet
          console.log(payloadStr.slice(0, 1500));
        }
      }
    }
  }
}

search();
