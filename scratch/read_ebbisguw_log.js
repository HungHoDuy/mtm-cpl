import fs from 'fs';

const html = fs.readFileSync('D:/mtm/CPL/team-sdlc-pack/logs/EBBISGUW.dashboard.html', 'utf8');

const startIdx = html.indexOf('initialSnapshot=');
const jsonStart = html.indexOf('{', startIdx);
let depth = 0;
let jsonEnd = -1;
let inString = false;
let escape = false;
for (let i = jsonStart; i < html.length; i++) {
  const c = html[i];
  if (escape) { escape = false; continue; }
  if (c === '\\') { escape = true; continue; }
  if (c === '"') { inString = !inString; continue; }
  if (!inString) {
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { jsonEnd = i + 1; break; } }
  }
}
const snap = JSON.parse(html.slice(jsonStart, jsonEnd));
const t24 = snap.toolActivity[23];
const t26 = snap.toolActivity[25];
console.log('T24 keys:', Object.keys(t24));
console.log('T24 details:', JSON.stringify(t24, null, 2));
