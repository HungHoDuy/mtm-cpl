import fs from 'fs';

const data = JSON.parse(fs.readFileSync('d:/mtm/scratch/cr01_oi1ofz0i_grader.json', 'utf8'));
const g = data.submission?.grader;

console.log('Grader status:', g?.status);
console.log('Points awarded:', g?.points);
console.log('Explanation:\n' + g?.explanation);
if (g?.extra?.assertions) {
  console.log('\nAssertions:');
  for (const a of g.extra.assertions) {
    console.log(`[${a.status}] ${a.title} (${a.awardedPoints}/${a.maximumPoints}): ${a.checkDetail || ''}`);
  }
}

