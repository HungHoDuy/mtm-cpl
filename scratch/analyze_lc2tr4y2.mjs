import fs from 'fs';

// 1. Check progress.ndjson
const progressLines = fs.readFileSync('D:/mtm/CPL/team-sdlc-pack/logs/LC2TR4Y2.progress.ndjson', 'utf8')
  .trim().split('\n').filter(Boolean).map(l => JSON.parse(l));

console.log('--- PROGRESS.NDJSON SUMMARY ---');
console.log('Total events:', progressLines.length);

for (const p of progressLines) {
  if (p.type === 'BACKLOG_STATUS' || p.type === 'ORCHESTRATOR_STARTED' || p.type === 'ENVIRONMENT_READY' || p.stage || p.operation === 'SUBMIT_BACKLOG' || p.operation === 'START_BACKLOG') {
    console.log(`[${p.type || p.stage || p.operation}] ${p.backlogId || ''} - ${p.status || p.phase || ''}: ${p.summary || p.title || ''}`);
  }
}

