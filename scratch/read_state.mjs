import fs from 'fs';

const state = JSON.parse(fs.readFileSync('d:/mtm/scratch/state_38IX07C9.json', 'utf8'));
console.log('Match Status:', state.status);
console.log('Total Score:', state.score || state.totalScore);

const team = state.teams ? (Array.isArray(state.teams) ? state.teams[0] : Object.values(state.teams)[0]) : null;
console.log('Team Info:', team ? { name: team.name, score: team.score, breakdown: team.scoreBreakdown } : 'none');

if (state.backlogs || state.tasks) {
  const list = state.backlogs || state.tasks;
  for (const b of (Array.isArray(list) ? list : Object.values(list))) {
    console.log(`\n--- ${b.key || b.id}: ${b.title} ---`);
    console.log(`Status: ${b.status}, Points: ${b.points}, Score: ${b.score}`);
    if (b.submission) {
      console.log('Submission:', b.submission.status, b.submission.score);
    }
  }
}

