import fs from 'fs';

const lines = fs.readFileSync('D:/mtm/CPL/team-sdlc-pack/logs/LC2TR4Y2.progress.ndjson', 'utf8')
  .trim().split('\n').filter(Boolean).map(l => JSON.parse(l));

for (let i = 25; i < 90; i++) {
  const p = lines[i];
  if (!p) break;
  console.log(`[#${i}] type=${p.type} backlogId=${p.backlogId || ''} status=${p.status || ''} summary=${p.summary || p.title || ''}`);
}

