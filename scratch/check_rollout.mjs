import fs from 'node:fs';
import readline from 'node:readline';

const filePath = 'C:\\Users\\ADMIN\\.codex\\sessions\\2026\\11\\02\\rollout-2026-11-02T13-41-04-01a19afd-73d4-7321-995f-481a9828f60d.jsonl';
const rl = readline.createInterface({
  input: fs.createReadStream(filePath),
  crlfDelay: Infinity
});

for await (const line of rl) {
  try {
    const obj = JSON.parse(line);
    if (obj.payload && obj.payload.content) {
      for (const c of obj.payload.content) {
        if (c.text && !c.text.startsWith('{"risk_level"')) {
          console.log('--- MSG ---');
          console.log(c.text.slice(0, 300));
        }
      }
    }
  } catch (e) {}
}
