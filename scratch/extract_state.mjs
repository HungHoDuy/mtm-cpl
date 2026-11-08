import fs from 'fs';

const html = fs.readFileSync('d:/mtm/scratch/spectator_CMSC8VA4.html', 'utf8');

const target = '\\"initialState\\":';
let startIdx = html.indexOf(target);
if (startIdx === -1) {
  startIdx = html.indexOf('initialState');
}

if (startIdx !== -1) {
  console.log('Found at:', startIdx);
  const slice = html.slice(startIdx - 50, startIdx + 45000);
  fs.writeFileSync('d:/mtm/scratch/initial_state_raw.txt', slice);
  console.log('Saved slice');
} else {
  console.log('Target still not found!');
}
