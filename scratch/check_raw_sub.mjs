import fs from 'fs';

const data = JSON.parse(fs.readFileSync('d:/mtm/scratch/submission_details_38IX07C9.json', 'utf8'));
const cpl = data.CPL;
console.log('BUG-01 keys:', Object.keys(cpl['BUG-01'].submission));
console.log('BUG-01 raw:', JSON.stringify(cpl['BUG-01'].submission, null, 2).slice(0, 500));
console.log('\nBUG-02 raw:', JSON.stringify(cpl['BUG-02'].submission, null, 2).slice(0, 500));

