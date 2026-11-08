import fs from 'fs';

const s = JSON.parse(fs.readFileSync('d:/mtm/scratch/state_38IX07C9.json'));
console.log('Events count:', s.events?.length);
const scoredEvents = s.events?.filter(e => e.type?.includes('SCORE') || e.type?.includes('SUBMI') || e.payload?.score !== undefined || e.payload?.testCases);
console.log('Scored events count:', scoredEvents?.length);
for (const e of (scoredEvents || [])) {
  console.log(`\nEvent ${e.type} at ${e.timestamp}:`);
  console.log(JSON.stringify(e.payload || e, null, 2).slice(0, 1000));
}

