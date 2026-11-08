import fs from 'fs';

const lines = fs.readFileSync('D:/mtm/CPL/team-sdlc-pack/logs/ZV98D2FF.progress.ndjson', 'utf8')
  .trim().split(/\r?\n/).map(l => JSON.parse(l));

const submits = lines.filter(e => e.operation === 'SUBMIT_BACKLOG' && e.phase === 'SUCCEEDED');
console.log('--- SUBMISSION ORDER & TIMELINE ---');
submits.forEach((s, idx) => {
  console.log(`#${idx + 1}: ${s.backlogId} (http ${s.httpStatus})`);
});

