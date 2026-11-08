import fs from 'fs';

const s = JSON.parse(fs.readFileSync('d:/mtm/scratch/state_38IX07C9.json'));
console.log('Scoreboard:', JSON.stringify(s.scoreboard, null, 2));

console.log('\n--- Backlog Summary ---');
if (Array.isArray(s.backlog)) {
  for (const b of s.backlog) {
    console.log(`${b.key}: status=${b.status}, points=${b.points}`);
  }
} else {
  console.log(s.backlog);
}

