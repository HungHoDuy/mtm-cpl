import fs from 'fs';

const snapshot = JSON.parse(fs.readFileSync('d:/mtm/scratch/parsed_snapshot.json', 'utf8'));

console.log('Sample toolActivity #0:', JSON.stringify(snapshot.toolActivity[0], null, 2));
console.log('Sample toolActivity #1:', JSON.stringify(snapshot.toolActivity[1], null, 2));
console.log('Sample toolActivity #2:', JSON.stringify(snapshot.toolActivity[2], null, 2));

