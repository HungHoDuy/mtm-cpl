import fs from 'fs';

const data = JSON.parse(fs.readFileSync('d:/mtm/scratch/sub_38IX07C9.json', 'utf8'));
const cpl = data['CPL'] || data[Object.keys(data)[0]];

console.log('================ 38IX07C9 GRADER BREAKDOWN ================');
for (const [key, item] of Object.entries(cpl)) {
  console.log(`\n>>> [${key}] HTTP Status: ${item.status}`);
  if (item.sub) {
    const s = item.sub;
    console.log(`Score: ${s.score ?? s.submission?.score} / ${s.maxScore ?? s.submission?.maxScore ?? s.points}`);
    console.log(`Status: ${s.status ?? s.submission?.status}`);
    const evalData = s.evaluation || s.submission?.evaluation || s;
    if (evalData.testCases) {
      console.log('Test Cases:');
      for (const tc of evalData.testCases) {
        console.log(`  - ${tc.id || tc.name}: ${tc.score}/${tc.maxScore} (${tc.status}) ${tc.reason || ''}`);
      }
    }
    if (s.graderLogs || evalData.graderLogs || s.feedback) {
      console.log('Grader Feedback / Logs:');
      console.log(s.graderLogs || evalData.graderLogs || s.feedback);
    }
  }
}

