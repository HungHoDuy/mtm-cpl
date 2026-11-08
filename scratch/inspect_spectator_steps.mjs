import fs from 'fs';

const data = JSON.parse(fs.readFileSync('d:/mtm/scratch/spectator_ZV98D2FF_state.json', 'utf8'));

console.log('steps type:', typeof data.steps, Array.isArray(data.steps), data.steps?.length);
console.log('teamActivity type:', typeof data.teamActivity, Array.isArray(data.teamActivity), data.teamActivity?.length);

if (Array.isArray(data.steps) && data.steps.length > 0) {
  console.log('First step:', JSON.stringify(data.steps[0], null, 2));
  console.log('Last step:', JSON.stringify(data.steps[data.steps.length - 1], null, 2));
}

if (data.teamActivity) {
  console.log('teamActivity keys or sample:', Object.keys(data.teamActivity));
}

