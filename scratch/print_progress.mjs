import fs from 'fs';

const lines = fs.readFileSync('d:/mtm/CPL/team-sdlc-pack/logs/K0LA4Z5T.progress.ndjson', 'utf8')
  .trim().split('\n').filter(Boolean).map(l => JSON.parse(l));

let out = '';
lines.forEach((l, i) => {
  out += `\n--- [${i}] ${l.type} ---\n` + JSON.stringify(l, null, 2) + '\n';
});
fs.writeFileSync('d:/mtm/scratch/progress_dump.txt', out, 'utf8');
console.log('Written utf8, entries:', lines.length);
