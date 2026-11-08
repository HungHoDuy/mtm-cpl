import fs from 'fs';
import readline from 'readline';

async function checkRollout(path) {
  console.log('Checking rollout:', path);
  const stream = fs.createReadStream(path);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let count = 0;
  let userPrompts = [];
  let toolCommands = [];
  
  for await (const line of rl) {
    count++;
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed.type === 'event_msg' && parsed.payload) {
        if (parsed.payload.type === 'user_message') {
          userPrompts.push(parsed.payload.text?.slice(0, 150));
        }
      }
      // Check tool calls
      if (parsed.payload && parsed.payload.tool_name) {
        toolCommands.push(parsed.payload.tool_name);
      }
      // Check exec commands
      if (parsed.payload?.command) {
        toolCommands.push(parsed.payload.command.slice(0, 80));
      }
    } catch (e) {}
  }
  console.log(`Total lines: ${count}`);
  console.log('User prompts:', userPrompts);
  console.log('Sample tool commands/calls (first 10):', toolCommands.slice(0, 10));
}

await checkRollout('C:/Users/ADMIN/.codex/sessions/2026/11/02/rollout-2026-11-02T16-18-56-01a19b8d-fc86-75a1-bdb6-7c6e2b873ede.jsonl');
console.log('----------------------------');
await checkRollout('C:/Users/ADMIN/.codex/sessions/2026/11/02/rollout-2026-11-02T16-18-56-01a19b8d-fde7-75c1-a52e-c5e6fad2d259.jsonl');

