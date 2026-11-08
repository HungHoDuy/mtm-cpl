import fs from 'fs';

const details = JSON.parse(fs.readFileSync('d:/mtm/scratch/submission_details_EBBISGUW.json', 'utf8'));

console.log('================ GRADER COMPARISON (CPL vs MS5) ================');

const items = Object.keys(details.MS5);

for (const item of items) {
  const cplSub = details.CPL?.[item];
  const ms5Sub = details.MS5?.[item];

  const cplGrader = cplSub?.submission?.grader;
  const ms5Grader = ms5Sub?.submission?.grader;

  console.log(`\n------------------------------------------------------------`);
  console.log(`TASK: ${item}`);
  console.log(`CPL status: ${cplSub?.submissionStatus}, Grader Points: ${cplGrader?.points}`);
  console.log(`MS5 status: ${ms5Sub?.submissionStatus}, Grader Points: ${ms5Grader?.points}`);

  if (cplGrader?.points !== ms5Grader?.points || !cplGrader) {
    console.log(`>>> DIFFERENCE DETECTED in ${item} <<<`);
    console.log(`CPL Grader Summary:`, cplGrader?.summary || cplGrader?.explanation);
    console.log(`MS5 Grader Summary:`, ms5Grader?.summary || ms5Grader?.explanation);

    if (cplGrader?.extra?.assertions) {
      console.log(`CPL Assertions:`);
      for (const a of cplGrader.extra.assertions) {
        console.log(`  [${a.status}] ${a.title} (${a.awardedPoints}/${a.maximumPoints}): ${a.checkDetail || ''}`);
      }
    }
    if (ms5Grader?.extra?.assertions) {
      console.log(`MS5 Assertions:`);
      for (const a of ms5Grader.extra.assertions) {
        console.log(`  [${a.status}] ${a.title} (${a.awardedPoints}/${a.maximumPoints}): ${a.checkDetail || ''}`);
      }
    }
  }
}

