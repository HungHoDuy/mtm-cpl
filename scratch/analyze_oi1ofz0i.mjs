import fs from 'fs';

const state = JSON.parse(fs.readFileSync('d:/mtm/scratch/spectator_OI1OFZ0I_initialState.json', 'utf8'));

console.log('=== ACTIVITY ===');
state.activity?.forEach(a => {
  console.log(`${a.at} | ${a.kind} | ${a.teamCode || 'ALL'} | ${a.backlogItemKey || '-'} | ${a.text}`);
});

console.log('\n=== TEAM ACTIVITY ===');
console.log(JSON.stringify(state.teamActivity, null, 2));

console.log('\n=== STEPS ===');
state.steps?.forEach(s => {
  console.log(`${s.stepOrder} | ${s.title} | ${s.status} | duration: ${s.suggestedDurationSec}s`);
});

console.log('\n=== EVENTS ===');
state.events?.forEach(e => {
  console.log(JSON.stringify(e));
});
