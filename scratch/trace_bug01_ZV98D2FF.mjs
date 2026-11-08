import fs from 'fs';

const lines = fs.readFileSync('D:/mtm/CPL/team-sdlc-pack/logs/ZV98D2FF.progress.ndjson', 'utf8')
  .trim().split(/\r?\n/).map(l => JSON.parse(l));

console.log('Total events in progress.ndjson:', lines.length);

console.log('\n======================================================');
console.log(' ALL EVENTS IN CHRONOLOGICAL ORDER WITH TIMESTAMPS:');
console.log('======================================================');
lines.forEach((e, i) => {
  const ts = e.timestamp ? new Date(e.timestamp).toISOString() : '';
  const id = e.backlogId || e.stage || '';
  const op = e.operation || '';
  const st = e.status || '';
  const sum = (e.summary || '').slice(0, 100);
  console.log(`[#${i}] ${e.type} | ID:${id} | OP:${op} | ST:${st} | ${sum}`);
});

