import fs from 'fs';

const rolloutPath = 'C:/Users/ADMIN/.codex/sessions/2026/11/04/rollout-2026-11-04T19-37-08-01a1a690-2a91-7b30-90b4-7be65bad53c1.jsonl';
const lines = fs.readFileSync(rolloutPath, 'utf8').split('\n').filter(Boolean);

console.log('Total lines:', lines.length);

const toolCalls = [];

for (const line of lines) {
  try {
    const entry = JSON.parse(line);
    // Find tool calls or messages
    const ts = entry.timestamp;
    const payload = entry.payload;
    if (!payload) continue;

    if (entry.type === 'response_item') {
      if (payload.type === 'custom_tool_call') {
        toolCalls.push({
          ts,
          type: 'tool_call',
          name: payload.name || payload.call?.name,
          input: payload.input || payload.call?.input
        });
      } else if (payload.type === 'custom_tool_call_result') {
        toolCalls.push({
          ts,
          type: 'tool_result',
          id: payload.call_id,
          output: typeof payload.output === 'string' ? payload.output.slice(0, 150) : payload.output
        });
      } else if (payload.type === 'message' && payload.role === 'assistant') {
        // assistant message
        const text = payload.content?.find(c => c.type === 'text')?.text;
        if (text) {
          toolCalls.push({
            ts,
            type: 'assistant_text',
            text: text.slice(0, 150)
          });
        }
      }
    } else if (entry.type === 'session_event') {
      // event
      toolCalls.push({
        ts,
        type: 'event',
        name: payload.type || payload.name,
        data: payload
      });
    }
  } catch (e) {
    // ignore
  }
}

console.log('Extracted entries:', toolCalls.length);
fs.writeFileSync('d:/mtm/scratch/oi1ofz0i_extracted_calls.json', JSON.stringify(toolCalls, null, 2));
console.log('Saved d:/mtm/scratch/oi1ofz0i_extracted_calls.json');

