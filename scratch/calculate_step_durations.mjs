import fs from 'fs';

const commits = [
  { id: 'MATCH_START', time: '2026-11-05T07:28:33.699Z', desc: 'Wave 1 Released / Match Timer Starts' },
  { id: 'BUG-02', time: '2026-11-05T07:36:43.000Z', desc: 'fix(BUG-02): implement solution and package evidence' },
  { id: 'BUG-03', time: '2026-11-05T07:38:04.000Z', desc: 'fix(BUG-03): implement solution and package evidence' },
  { id: 'PI-01',  time: '2026-11-05T07:42:12.000Z', desc: 'fix(PI-01): implement solution and package evidence' },
  { id: 'CR-01',  time: '2026-11-05T07:42:58.000Z', desc: 'fix(CR-01): implement solution and package evidence' },
  { id: 'CR-02',  time: '2026-11-05T07:44:58.000Z', desc: 'fix(CR-02): implement solution and package evidence' },
  { id: 'BUG-01', time: '2026-11-05T07:52:46.000Z', desc: 'fix(BUG-01): implement solution and package evidence' },
  { id: 'TASK-03',time: '2026-11-05T07:54:51.000Z', desc: 'fix(TASK-03): implement solution and package evidence' },
  { id: 'CR-03',  time: '2026-11-05T07:58:30.000Z', desc: 'fix(CR-03): implement solution and package evidence' },
  { id: 'BUG-04', time: '2026-11-05T08:00:54.000Z', desc: 'fix(BUG-04): implement solution and package evidence' },
  { id: 'TASK-04',time: '2026-11-05T08:01:44.000Z', desc: 'fix(TASK-04): implement solution and package evidence' },
];

console.log('--- TASK STEP DURATIONS (From previous completion to this commit) ---');
for (let i = 1; i < commits.length; i++) {
  const prev = new Date(commits[i-1].time).getTime();
  const curr = new Date(commits[i].time).getTime();
  const diffSec = Math.round((curr - prev) / 1000);
  const m = Math.floor(diffSec / 60);
  const s = diffSec % 60;
  console.log(`${commits[i].id.padEnd(8)} | Duration: ${diffSec.toString().padStart(4)}s (${m}m ${s.toString().padStart(2, '0')}s) | Cumulative: ${Math.round((curr - new Date(commits[0].time).getTime())/1000)}s | ${commits[i].desc}`);
}

