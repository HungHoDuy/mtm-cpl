import fs from 'fs';

const html = fs.readFileSync('D:/mtm/CPL/team-sdlc-pack/logs/LC2TR4Y2.dashboard.html', 'utf8');
const match = html.match(/const initialSnapshot=(\{.*?\});if\(initialSnapshot\)/s);

if (match) {
  const data = JSON.parse(match[1]);
  fs.writeFileSync('d:/mtm/scratch/dashboard_snapshot.json', JSON.stringify(data, null, 2));
  console.log('Saved dashboard snapshot!');
  console.log('Backlogs in snapshot:');
  for (const b of data.backlogs) {
    console.log(`[${b.id}] ${b.title} | Status: ${b.status} | ActiveSec: ${b.observedActiveSeconds} | Tests: ${JSON.stringify(b.tests)}`);
  }
} else {
  console.log('Could not find initialSnapshot');
}

