import fs from 'fs';

const lines = fs.readFileSync('D:/mtm/CPL/team-sdlc-pack/logs/ZV98D2FF.progress.ndjson', 'utf8')
  .trim().split(/\r?\n/).map(JSON.parse);

console.log('--- ALL EVENTS DURING BUG-02 WINDOW (events 11 to 45) ---');
for (let i = 11; i <= 45; i++) {
  const l = lines[i];
  if (!l) continue;
  console.log(`[#${i}] ${l.type} | ${l.operation || ''} | ${l.backlogId || ''} | ${l.status || ''} | ${l.summary || l.message || ''}`);
  if (l.data) console.log('   data:', JSON.stringify(l.data).slice(0, 150));
}

