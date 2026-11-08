import fs from 'fs';

const state = JSON.parse(fs.readFileSync('d:/mtm/scratch/spectator_YTFHP47K_initialState.json', 'utf8'));

console.log('Match:', state.match);
console.log('Teams count:', state.teams?.length);

for (const team of state.teams || []) {
  console.log(`\n=== Team ${team.teamCode} (${team.teamName}) ===`);
  console.log(`Points: ${team.totalPoints}, Submitted: ${team.submitted}/${team.total}`);
  console.log('Cells:');
  for (const cell of team.cells || []) {
    console.log(JSON.stringify(cell));
  }
}

console.log('\n=== Recent Events (last 20) ===');
for (const ev of (state.events || []).slice(-20)) {
  console.log(`[${ev.timestamp || ev.createdAt}] ${ev.type || ev.eventType} - ${ev.teamCode || ''}: ${JSON.stringify(ev.payload || ev.data || ev.summary || '')}`);
}

