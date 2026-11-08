import fs from 'fs';

const data = JSON.parse(fs.readFileSync('d:/mtm/scratch/dashboard_snapshot.json', 'utf8'));

console.log('Top keys of snapshot:', Object.keys(data));
if (data.events) {
  console.log('Total events in snapshot:', data.events.length);
  // print first 5 and last 5
  data.events.slice(0, 5).forEach(e => console.log(JSON.stringify(e)));
}
if (data.operations) {
  console.log('Operations count:', data.operations.length);
}
if (data.localApplication?.activity) {
  console.log('Activity:', data.localApplication.activity);
}

