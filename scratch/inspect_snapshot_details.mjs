import fs from 'fs';

const snapshot = JSON.parse(fs.readFileSync('d:/mtm/scratch/parsed_snapshot.json', 'utf8'));

console.log('toolActivity type:', typeof snapshot.toolActivity, Array.isArray(snapshot.toolActivity));
if (snapshot.toolActivity) {
  console.log('toolActivity keys or count:', Array.isArray(snapshot.toolActivity) ? snapshot.toolActivity.length : Object.keys(snapshot.toolActivity));
}

console.log('\nprocessActivity type:', typeof snapshot.processActivity, Array.isArray(snapshot.processActivity));
if (snapshot.processActivity) {
  console.log('processActivity count:', Array.isArray(snapshot.processActivity) ? snapshot.processActivity.length : Object.keys(snapshot.processActivity));
}

console.log('\neventConsole count:', snapshot.eventConsole?.length);
if (snapshot.eventConsole && snapshot.eventConsole.length > 0) {
  console.log('Sample eventConsole item:', snapshot.eventConsole[0]);
}

