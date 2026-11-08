import fs from 'fs';

const cr01EvDir = 'D:/mtm/CPL/matches/ZV98D2FF/ZV98D2FF/answers/CR-01/evidence';
const bug01EvDir = 'D:/mtm/CPL/matches/ZV98D2FF/ZV98D2FF/answers/BUG-01/evidence';

console.log('--- CR-01 EVIDENCE FILES MTIME ---');
fs.readdirSync(cr01EvDir).forEach(f => {
  const s = fs.statSync(cr01EvDir + '/' + f);
  console.log(`CR-01: ${f.padEnd(30)} | ${s.mtime.toISOString()} | ${s.size} bytes`);
});

console.log('\n--- BUG-01 EVIDENCE FILES MTIME ---');
fs.readdirSync(bug01EvDir).forEach(f => {
  const s = fs.statSync(bug01EvDir + '/' + f);
  console.log(`BUG-01: ${f.padEnd(30)} | ${s.mtime.toISOString()} | ${s.size} bytes`);
});

