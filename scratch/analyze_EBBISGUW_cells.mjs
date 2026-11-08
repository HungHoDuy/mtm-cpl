import fs from 'fs';

const data = JSON.parse(fs.readFileSync('d:/mtm/scratch/spectator_EBBISGUW_initialState.json', 'utf8'));

console.log('=== MATCH DETAILS ===');
console.log(data.match);

const cpl = data.teams.find(t => t.teamCode === 'CPL');
const ms5 = data.teams.find(t => t.teamCode === 'MS5');

console.log('\n=== CPL SUMMARY ===');
console.log('Total Points:', cpl.totalPoints, 'Submitted:', cpl.submitted, '/', cpl.total);

console.log('\n=== MS5 SUMMARY ===');
console.log('Total Points:', ms5.totalPoints, 'Submitted:', ms5.submitted, '/', ms5.total);

console.log('\n=== TASK BY TASK COMPARISON ===');
const allTasks = cpl.cells.map(c => c.backlogItemKey);

for (const taskKey of allTasks) {
  const cCell = cpl.cells.find(c => c.backlogItemKey === taskKey);
  const mCell = ms5.cells.find(c => c.backlogItemKey === taskKey);

  console.log(`\n--- [${taskKey}] ${cCell.title} ---`);
  console.log(`  CPL: Points=${cCell.points} (Grader=${cCell.graderPoints}, Deduct=${cCell.piDeduction}), Status=${cCell.workStatus}/${cCell.scoreStatus}, Attempt=${cCell.attemptNo}, PI-Order=${cCell.piSubmitOrder}`);
  console.log(`  MS5: Points=${mCell.points} (Grader=${mCell.graderPoints}, Deduct=${mCell.piDeduction}), Status=${mCell.workStatus}/${mCell.scoreStatus}, Attempt=${mCell.attemptNo}, PI-Order=${mCell.piSubmitOrder}`);
}

