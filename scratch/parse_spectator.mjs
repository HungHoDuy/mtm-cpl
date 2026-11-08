import fs from 'fs';

const html = fs.readFileSync('d:/mtm/scratch/spectator_CMSC8VA4.html', 'utf8');

// Find JSON objects or data inside the page
// Let's search for score, challenges, match data
fs.writeFileSync('d:/mtm/scratch/spectator_CMSC8VA4.txt', html);

// Look for script tags
const matches = [...html.matchAll(/self\.__next_f\.push\(\[1,"(.*)"\]\)/g)];
console.log('Found push matches:', matches.length);

let combined = '';
for (const m of matches) {
  try {
    const unescaped = JSON.parse(`"${m[1]}"`);
    combined += unescaped + '\n';
  } catch (e) {
    // try naive
    combined += m[1] + '\n';
  }
}

fs.writeFileSync('d:/mtm/scratch/spectator_extracted.txt', combined);
console.log('Saved extracted text, length:', combined.length);

