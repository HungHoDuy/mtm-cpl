import fs from 'fs';

const snapshot = JSON.parse(fs.readFileSync('d:/mtm/scratch/parsed_snapshot.json', 'utf8'));

console.log('Sample failed tool item keys:', Object.keys(snapshot.toolActivity.find(t => t.phase === 'FAILED')));
console.log('Sample failed tool item:', JSON.stringify(snapshot.toolActivity.find(t => t.phase === 'FAILED'), null, 2));

