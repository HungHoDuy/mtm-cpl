import fs from 'fs';

const state = JSON.parse(fs.readFileSync('d:/mtm/scratch/spectator_EBBISGUW_initialState.json', 'utf8'));

console.log('Events count:', state.events ? state.events.length : 0);
if (state.events) {
  for (const e of state.events) {
    console.log(`[${e.timestamp || e.time || ''}] [${e.type}] Team: ${e.teamCode || e.teamId} Task: ${e.backlogItemKey || e.taskKey || ''} - ${JSON.stringify(e)}`);
  }
}

