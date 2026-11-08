import fs from 'fs';

const html = fs.readFileSync('D:/mtm/scratch/match_LC2TR4Y2.html', 'utf8');

const matches = [...html.matchAll(/self\.__next_f\.push\(\[1,"(.*)"\]\)/g)];
console.log('Found push matches:', matches.length);

let combined = '';
for (const m of matches) {
  try {
    const unescaped = JSON.parse(`"${m[1]}"`);
    combined += unescaped + '\n';
  } catch (e) {
    combined += m[1] + '\n';
  }
}

fs.writeFileSync('d:/mtm/scratch/lc2tr4y2_match_extracted.txt', combined);
console.log('Saved extracted text, length:', combined.length);

// Search for score, submission, rank, PI-01
console.log('\n--- Searching for PI-01 in extracted ---');
const idx = combined.indexOf('PI-01');
if (idx !== -1) {
  console.log('Context around PI-01:');
  console.log(combined.slice(idx - 200, idx + 500));
}

// Search for scores
const scoreIdx = combined.indexOf('score');
if (scoreIdx !== -1) {
  console.log('\nContext around score:');
  console.log(combined.slice(scoreIdx - 100, scoreIdx + 400));
}

