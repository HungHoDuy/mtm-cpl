import fs from 'fs';

const raw = fs.readFileSync('d:/mtm/scratch/initial_state_raw.txt', 'utf8');

// The flight data in next_f has escaped quotes and newlines.
// Let's find the script block containing this
const html = fs.readFileSync('d:/mtm/scratch/spectator_CMSC8VA4.html', 'utf8');
const regex = /self\.__next_f\.push\(\[1,"(.*)"\]\)/gs;

// Let's search all chunks
let fullText = '';
for (const match of html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)) {
  try {
    const decoded = JSON.parse(`"${match[1]}"`);
    fullText += decoded;
  } catch (e) {
    fullText += match[1];
  }
}

// In fullText, look for initialState
const idx = fullText.indexOf('"initialState":');
if (idx !== -1) {
  console.log('Found in fullText at:', idx);
  // find matching { }
  let depth = 0;
  let start = fullText.indexOf('{', idx);
  let end = -1;
  for (let i = start; i < fullText.length; i++) {
    if (fullText[i] === '{') depth++;
    else if (fullText[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end !== -1) {
    const jsonStr = fullText.slice(start, end + 1);
    const parsed = JSON.parse(jsonStr);
    fs.writeFileSync('d:/mtm/scratch/spectator_initialState.json', JSON.stringify(parsed, null, 2));
    console.log('Successfully parsed and saved initialState!');
  } else {
    console.log('Could not find matching closing brace');
  }
} else {
  console.log('initialState not found in fullText, writing fullText to inspect');
  fs.writeFileSync('d:/mtm/scratch/fullText.txt', fullText);
}

