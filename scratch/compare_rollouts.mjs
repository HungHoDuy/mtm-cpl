import fs from 'fs';

const r1 = JSON.parse(fs.readFileSync('d:/mtm/scratch/lc2tr4y2_rollout_1.json', 'utf8'));
const r2 = JSON.parse(fs.readFileSync('d:/mtm/scratch/lc2tr4y2_rollout_2.json', 'utf8'));

console.log('=== Rollout 1 first 5 entries ===');
r1.slice(0, 5).forEach(e => console.log(e.time, e.type, e.name || e.text?.slice(0, 100)));

console.log('=== Rollout 2 first 5 entries ===');
r2.slice(0, 5).forEach(e => console.log(e.time, e.type, e.name || e.text?.slice(0, 100)));

console.log('=== Rollout 1 tool calls ===');
const r1Tools = r1.filter(e => e.type === 'tool_call');
console.log('Total tool calls in r1:', r1Tools.length);
r1Tools.forEach(t => {
  const cmd = t.input?.command || t.input?.path || JSON.stringify(t.input);
  console.log(`[${t.time}] ${t.name}: ${cmd?.slice(0, 120)}`);
});

console.log('\n=== Rollout 2 tool calls ===');
const r2Tools = r2.filter(e => e.type === 'tool_call');
console.log('Total tool calls in r2:', r2Tools.length);
r2Tools.forEach(t => {
  const cmd = t.input?.command || t.input?.path || JSON.stringify(t.input);
  console.log(`[${t.time}] ${t.name}: ${cmd?.slice(0, 120)}`);
});

