import fs from 'fs';

const html = fs.readFileSync('d:/mtm/scratch/spectator_CMSC8VA4.html', 'utf8');

// Find all script tags
const scriptMatches = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]);
console.log('Scripts:', scriptMatches);

// Also look at the text of the html
console.log('HTML slice around matchId or CMSC8VA4:');
let idx = 0;
while ((idx = html.indexOf('CMSC8VA4', idx)) !== -1) {
  console.log('--- at', idx, '---');
  console.log(html.slice(Math.max(0, idx - 100), Math.min(html.length, idx + 300)));
  idx += 8;
}

