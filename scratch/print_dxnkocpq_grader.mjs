import fs from 'fs';

const data = JSON.parse(fs.readFileSync('d:/mtm/scratch/submission_details_DXNKOCPQ.json', 'utf8'));

for (const team of ['CPL', 'FRA']) {
  const g = data[team]['CR-01'].submission?.grader;
  console.log(`================ ${team} CR-01 ================`);
  console.log('Points:', g?.points);
  console.log('Explanation:\n' + g?.explanation);
  if (g?.extra?.assertions) {
    console.log('Assertions:');
    for (const a of g.extra.assertions) {
      console.log(`  [${a.status}] ${a.title} (${a.awardedPoints}/${a.maximumPoints}): ${a.checkDetail || ''}`);
    }
  }
}

