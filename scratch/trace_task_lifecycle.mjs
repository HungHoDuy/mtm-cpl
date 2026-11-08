import fs from 'fs';

const lines = fs.readFileSync('D:/mtm/CPL/team-sdlc-pack/logs/ZV98D2FF.progress.ndjson', 'utf8')
  .trim().split(/\r?\n/).map(l => JSON.parse(l));

console.log('--- ALL TASK START AND SUBMIT EVENTS ---');
lines.forEach((e, idx) => {
  if (e.type === 'BACKLOG_STATUS' || (e.operation && e.operation.includes('BACKLOG'))) {
    const time = e.timestamp || '';
    console.log(`[#${idx}] ${e.type} | op: ${e.operation || ''} | key: ${e.backlogId} | status: ${e.status || ''} | ${e.summary}`);
  }
});

