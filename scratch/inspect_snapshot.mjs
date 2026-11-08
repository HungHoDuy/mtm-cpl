import fs from 'fs';

const html = fs.readFileSync('D:/mtm/CPL/team-sdlc-pack/logs/ZV98D2FF.dashboard.html', 'utf8');

const m = html.match(/(?:const|let|var)\s+initialSnapshot\s*=\s*(\{[\s\S]*?\});/);
if (m) {
  const snapshot = JSON.parse(m[1]);
  console.log('Snapshot keys:', Object.keys(snapshot));
  if (snapshot.events) console.log('events count:', snapshot.events.length);
  if (snapshot.cliEvents) console.log('cliEvents count:', snapshot.cliEvents.length);
  if (snapshot.timeline) console.log('timeline count:', snapshot.timeline.length);
  if (snapshot.transcripts) console.log('transcripts count:', snapshot.transcripts.length);
  fs.writeFileSync('d:/mtm/scratch/dashboard_initialSnapshot.json', JSON.stringify(snapshot, null, 2));
  console.log('Saved to d:/mtm/scratch/dashboard_initialSnapshot.json');
} else {
  console.log('initialSnapshot not matched');
}

