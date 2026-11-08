import fs from 'fs';

const html = fs.readFileSync('D:/mtm/CPL/team-sdlc-pack/logs/ZV98D2FF.dashboard.html', 'utf8');

const startIdx = html.indexOf('initialSnapshot=');
if (startIdx === -1) {
  console.log('Not found');
  process.exit(1);
}

const jsonStart = html.indexOf('{', startIdx);
let depth = 0;
let jsonEnd = -1;
let inString = false;
let escape = false;

for (let i = jsonStart; i < html.length; i++) {
  const c = html[i];
  if (escape) {
    escape = false;
    continue;
  }
  if (c === '\\') {
    escape = true;
    continue;
  }
  if (c === '"') {
    inString = !inString;
    continue;
  }
  if (!inString) {
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        jsonEnd = i + 1;
        break;
      }
    }
  }
}

console.log('jsonStart:', jsonStart, 'jsonEnd:', jsonEnd, 'Length:', jsonEnd - jsonStart);
const jsonStr = html.slice(jsonStart, jsonEnd);
const snapshot = JSON.parse(jsonStr);

console.log('Parsed successfully!');
console.log('Keys:', Object.keys(snapshot));
fs.writeFileSync('d:/mtm/scratch/parsed_snapshot.json', JSON.stringify(snapshot, null, 2));
console.log('Wrote d:/mtm/scratch/parsed_snapshot.json');

