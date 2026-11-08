import fs from 'fs';

const snap = JSON.parse(fs.readFileSync('d:/mtm/scratch/parsed_snapshot.json', 'utf8'));
const items = snap.toolActivity;

function cleanCommand(summary) {
  let s = summary.trim();
  // If it's a pwsh wrapped command
  const pwshPrefix = /^"C:\\\\Users\\\\ADMIN\\\\AppData\\\\Local\\\\Microsoft\\\\WindowsApps\\\\Microsoft\.PowerShell_8wekyb3d8bbwe\\\\pwsh\.exe"\s+-Command\s+"([\s\S]*)"$/;
  const match = s.match(pwshPrefix);
  if (match) {
    s = match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return s;
}

function detectTask(summary, startedAt, index) {
  const time = new Date(startedAt).getTime();
  // Timestamps of Waves:
  // Wave 1: 07:28:33
  // Wave 2: 07:36:34
  // Wave 3: 07:40:34
  // Wave 4: 07:48:34
  // Last sub: 08:01:45
  if (index <= 3 || summary.includes('prepare_environment') || summary.includes('configure_session') || summary.includes('game-preparation')) {
    return 'PREPARATION';
  }
  if (summary.includes('BUG-02') || summary.includes('seed-bug02') || summary.includes('report-bug02')) return 'BUG-02';
  if (summary.includes('BUG-03') || summary.includes('bug-03')) return 'BUG-03';
  if (summary.includes('CR-01') || summary.includes('cr-01') || summary.includes('export the filtered invoice')) return 'CR-01';
  if (summary.includes('PI-01') || summary.includes('pi-01') || summary.includes('reminder') || summary.includes('incident')) return 'PI-01';
  if (summary.includes('CR-02') || summary.includes('cr-02') || summary.includes('aging')) return 'CR-02';
  if (summary.includes('BUG-01') || summary.includes('bug-01') || summary.includes('layout')) return 'BUG-01';
  if (summary.includes('TASK-03') || summary.includes('task-03') || summary.includes('heatmap')) return 'TASK-03';
  if (summary.includes('CR-03') || summary.includes('cr-03') || summary.includes('company-detail')) return 'CR-03';
  if (summary.includes('BUG-04') || summary.includes('bug-04') || summary.includes('kanban') || summary.includes('board-screen')) return 'BUG-04';
  if (summary.includes('TASK-04') || summary.includes('task-04') || summary.includes('ledger')) return 'TASK-04';
  if (summary.includes('wait_for_update') || summary.includes('canonical submission') || summary.includes('restore canonical')) return 'POST_MATCH_AUDIT';
  
  // Contextual fallback by index/time
  if (index <= 35) return 'BUG-02';
  if (index <= 45) return 'BUG-03';
  if (index <= 60) return 'CR-01';
  if (index <= 66) return 'PI-01';
  if (index <= 74) return 'CR-02';
  if (index <= 106) return 'BUG-01';
  if (index <= 119) return 'TASK-03';
  if (index <= 130) return 'CR-03';
  if (index <= 142) return 'BUG-04';
  if (index <= 147) return 'TASK-04';
  return 'POST_MATCH_AUDIT';
}

function failureReason(item, index) {
  const s = item.summary;
  if (index === 13) return 'Missing generated Prisma client (`node_modules/.prisma/client` not found).';
  if (index === 14) return 'Database connection/schema deadlock during simultaneous generate and seed.';
  if ([15, 18, 20, 23, 24, 26, 27, 29].includes(index)) {
    return 'Dev server Turbopack JIT compilation delay & auth redirect loop on `/accounting` (11.2s compile + 12.9s redirect) exceeded Playwright default navigation timeout.';
  }
  if (index === 39) return 'PowerShell syntax error: multiple glob paths passed to Get-Content.';
  if (index === 40) return 'Baseline test failure: partial invoice status was unpaid before code fix was applied.';
  if (index === 81) return 'PowerShell syntax error in chained ripgrep command.';
  if (index === 108) return 'PowerShell parameter parsing error in rg syntax.';
  if (index === 112) return 'Quotation escaping error inside PowerShell multi-line `@\'...\'@` block.';
  if (index === 121) return 'Stop-Process error: PID 43132 was already terminated.';
  if (index === 123) return 'Baseline test failure: unhandled error on invalid contact URL before bug fix.';
  if (index === 124) return 'Dev server was still restarting/booting when `capture.mjs` attempted connection.';
  if (index === 133) return 'Ripgrep argument syntax error.';
  if (index === 137) return 'File not found: `ui-order.txt` was not yet created by the capture script.';
  return 'Process exited with non-zero exit code or timeout.';
}

const enriched = items.map((it, idx) => {
  const index = idx + 1;
  const startMs = new Date(it.startedAt).getTime();
  const endMs = new Date(it.timestamp).getTime();
  const durSec = ((endMs - startMs) / 1000).toFixed(1);
  const task = detectTask(it.summary, it.startedAt, index);
  const isFailed = it.phase === 'FAILED';
  const cleanCmd = cleanCommand(it.summary);
  const reason = isFailed ? failureReason(it, index) : null;
  return {
    index,
    task,
    toolName: it.toolName,
    operation: it.operation,
    phase: it.phase,
    startedAt: it.startedAt,
    finishedAt: it.timestamp,
    durSec: Number(durSec),
    cleanCmd,
    reason
  };
});

console.log('Enriched items:', enriched.length);
fs.writeFileSync('d:/mtm/scratch/enriched_commands.json', JSON.stringify(enriched, null, 2));
console.log('Wrote d:/mtm/scratch/enriched_commands.json');

