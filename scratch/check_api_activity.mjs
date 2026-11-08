import fs from 'fs';

const data = JSON.parse(fs.readFileSync('d:/mtm/scratch/dashboard_snapshot.json', 'utf8'));

console.log('apiActivity count:', data.apiActivity?.length);
data.apiActivity.forEach(a => {
  console.log(`[${a.timestamp || a.startedAt}] op=${a.operation} backlog=${a.backlogId} status=${a.httpStatus || a.status} path=${a.path || a.url}`);
});

