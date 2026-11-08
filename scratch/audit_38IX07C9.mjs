import fs from 'fs';

const data = JSON.parse(fs.readFileSync('d:/mtm/scratch/submission_details_38IX07C9.json', 'utf8'));
const cpl = data.CPL;

console.log('================================================================');
console.log('                 MATCH 38IX07C9 FORENSIC AUDIT                  ');
console.log('================================================================');

for (const [key, val] of Object.entries(cpl)) {
  const root = val.submission;
  const grader = root?.grader;
  console.log(`\n=================== [${key}] ===================`);
  console.log(`Points Awarded: ${grader?.points ?? 'N/A'}`);
  console.log(`Grader Explanation:`);
  console.log(grader?.explanation || 'No explanation');

  if (grader?.extra?.assertions) {
    console.log(`Assertions Breakdown:`);
    for (const a of grader.extra.assertions) {
      console.log(`  - [${a.status}] ${a.title || a.id} (${a.awardedPoints}/${a.maximumPoints}): ${a.checkDetail || ''}`);
    }
  }
}
