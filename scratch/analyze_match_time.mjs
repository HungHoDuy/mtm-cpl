import fs from 'fs';

const spectator = JSON.parse(fs.readFileSync('d:/mtm/scratch/spectator_ZV98D2FF_state.json', 'utf8'));

console.log('--- WAVES ---');
spectator.events.forEach(e => {
  console.log(`${e.key} | ${e.publishedAt} | ${e.title}`);
});

console.log('\n--- MATCH START & FINISH ---');
const match = spectator.match;
console.log('Match config:', match);

console.log('\n--- CPL TEAM TIMING ---');
const cpl = spectator.teams.find(t => t.teamCode === 'CPL');
console.log('lastSubmittedAt:', cpl.lastSubmittedAt);
console.log('totalTimeSec:', cpl.totalTimeSec, `(${Math.floor(cpl.totalTimeSec/60)}m ${cpl.totalTimeSec%60}s)`);
console.log('completionTimeSec:', cpl.completionTimeSec);

// Let's compute match start from lastSubmittedAt - totalTimeSec
const lastSubTime = new Date(cpl.lastSubmittedAt).getTime();
const matchStartTime = new Date(lastSubTime - cpl.totalTimeSec * 1000);
console.log('Calculated Match Start Time:', matchStartTime.toISOString());

