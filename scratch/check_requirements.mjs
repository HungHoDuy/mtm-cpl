import fs from 'node:fs';
const html = fs.readFileSync('D:/mtm/scratch/match_Y1KH6CB9.html', 'utf8');

const regex = /Add automated tests[^\n\\]+/gi;
let m;
while ((m = regex.exec(html)) !== null) {
  console.log(m[0]);
}
