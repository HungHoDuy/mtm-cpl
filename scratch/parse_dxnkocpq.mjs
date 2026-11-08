import fs from 'fs';

const html = fs.readFileSync('d:/mtm/scratch/spectator_DXNKOCPQ.html', 'utf8');

let fullText = '';
for (const match of html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)) {
  try {
    const decoded = JSON.parse(`"${match[1]}"`);
    fullText += decoded;
  } catch (e) {
    fullText += match[1];
  }
}

const idx = fullText.indexOf('"initialState":');
if (idx !== -1) {
  console.log('Found initialState at:', idx);
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
    fs.writeFileSync('d:/mtm/scratch/spectator_DXNKOCPQ_initialState.json', JSON.stringify(parsed, null, 2));
    console.log('Successfully saved spectator_DXNKOCPQ_initialState.json!');
  } else {
    console.log('Could not find matching brace');
  }
} else {
  console.log('initialState not found in fullText');
  fs.writeFileSync('d:/mtm/scratch/dxnkocpq_fullText.txt', fullText);
}

