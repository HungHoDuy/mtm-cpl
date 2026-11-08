import fs from 'node:fs';
const html = fs.readFileSync('D:/mtm/scratch/match_Y1KH6CB9.html', 'utf8');
console.log(html.substring(19800, 22000));
