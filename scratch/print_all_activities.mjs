import fs from 'fs';

const state = JSON.parse(fs.readFileSync('d:/mtm/scratch/spectator_EBBISGUW_initialState.json', 'utf8'));

console.log('=== MATCH TIMELINE (ACTIVITY) ===');
// Sort all activity chronological
const acts = [...state.activity].reverse();

for (const a of acts) {
  console.log(`[${a.at}] [${(a.teamCode || 'MATCH').padEnd(5)}] [${(a.kind || '').padEnd(10)}] [${(a.backlogItemKey || '').padEnd(8)}] ${a.text}`);
}

