import fs from 'fs';

const s = JSON.parse(fs.readFileSync('d:/mtm/scratch/state_38IX07C9.json'));
console.log('Teams:', JSON.stringify(s.teams, null, 2));
console.log('TeamActivity keys:', Object.keys(s.teamActivity || {}));
if (s.teamActivity) {
  for (const [k, v] of Object.entries(s.teamActivity)) {
    console.log(`TeamActivity for ${k}:`, JSON.stringify(v, null, 2).slice(0, 1500));
  }
}

