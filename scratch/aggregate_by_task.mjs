import fs from 'fs';

const items = JSON.parse(fs.readFileSync('d:/mtm/scratch/analyzed_commands.json', 'utf8'));

// Map each item to a task based on summary keywords or order
function getTask(summary, idx) {
  if (idx <= 3) return 'PREPARATION';
  if (summary.includes('BUG-02') || summary.includes('seed-bug02') || summary.includes('report-bug02')) return 'BUG-02';
  if (summary.includes('BUG-03') || summary.includes('mvs.test.ts') && idx < 50) return 'BUG-03';
  if (summary.includes('CR-01') || summary.includes('invoice') && idx < 60) return 'CR-01';
  if (summary.includes('PI-01') || summary.includes('reminder') || summary.includes('incident')) return 'PI-01';
  if (summary.includes('CR-02') || summary.includes('aging')) return 'CR-02';
  if (summary.includes('BUG-01') || summary.includes('layout')) return 'BUG-01';
  if (summary.includes('TASK-03') || summary.includes('heatmap')) return 'TASK-03';
  if (summary.includes('CR-03') || summary.includes('contact')) return 'CR-03';
  if (summary.includes('BUG-04') || summary.includes('board') || summary.includes('kanban')) return 'BUG-04';
  if (summary.includes('TASK-04') || summary.includes('ledger')) return 'TASK-04';
  if (summary.includes('wait_for_update') || summary.includes('canonical submission') || summary.includes('typecheck')) return 'POST_MATCH_AUDIT';
  return 'OTHER';
}

const taskGroups = {};

items.forEach(t => {
  const task = getTask(t.summary, t.index);
  if (!taskGroups[task]) {
    taskGroups[task] = {
      task,
      totalDurationSec: 0,
      totalCommands: 0,
      completed: 0,
      failed: 0,
      failures: [],
      longestCommand: null
    };
  }
  const grp = taskGroups[task];
  grp.totalDurationSec += t.durationSec;
  grp.totalCommands++;
  if (t.phase === 'COMPLETED') grp.completed++;
  else {
    grp.failed++;
    grp.failures.push({ index: t.index, dur: t.durationSec, summary: t.summary });
  }
  if (!grp.longestCommand || t.durationSec > grp.longestCommand.dur) {
    grp.longestCommand = { index: t.index, dur: t.durationSec, summary: t.summary.slice(0, 100).replace(/\n/g, ' ') };
  }
});

console.log('--- COMMAND EXECUTION SUMMARY BY TASK ---');
console.table(Object.values(taskGroups).map(g => ({
  Task: g.task,
  'Total Cmd Time': `${g.totalDurationSec.toFixed(1)}s (${Math.floor(g.totalDurationSec/60)}m ${(g.totalDurationSec%60).toFixed(1)}s)`,
  Commands: g.totalCommands,
  Passed: g.completed,
  Failed: g.failed,
  'Longest Single Cmd': `${g.longestCommand?.dur}s`
})));

