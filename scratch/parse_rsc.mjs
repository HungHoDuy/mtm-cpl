import fs from 'node:fs';

const html = fs.readFileSync('d:/mtm/scratch/spectator_RME543WG.html', 'utf8');
const chunks = [];
const re = /self\.__next_f\.push\(\[1,"(.*?)"\]\)/gs;
let m;
while ((m = re.exec(html)) !== null) {
  try {
    const raw = JSON.parse(`"${m[1]}"`);
    chunks.push(raw);
  } catch (e) {
    chunks.push(m[1]);
  }
}
const fullText = chunks.join('');
fs.writeFileSync('d:/mtm/scratch/spectator_RME543WG_fullText.txt', fullText);
console.log('Total extracted RSC text length:', fullText.length);

// Look for scoreboard or match state
const subMatch = fullText.match(/"submissions":(\[.*?\])/);
if (subMatch) {
  console.log('Found submissions string length:', subMatch[1].length);
  fs.writeFileSync('d:/mtm/scratch/spectator_RME543WG_submissions.json', subMatch[1]);
}
const scoreMatch = fullText.match(/"scoreboard":(\{.*?\})/);
if (scoreMatch) {
  console.log('Scoreboard:', scoreMatch[1].slice(0, 300));
}

