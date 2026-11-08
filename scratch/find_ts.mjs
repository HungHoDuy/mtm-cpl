import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('C:/Users/ADMIN/.codex/logs_2.sqlite', { readOnly: true });
// Find rows around ts
const rows = db.prepare("SELECT id, ts, feedback_log_body FROM logs WHERE feedback_log_body LIKE '%mcp__mtm_helper__prepare_environment%' OR feedback_log_body LIKE '%prepare-8816db5b%' ORDER BY id DESC LIMIT 20").all();
console.log('Found rows:', rows.length);
for (const r of rows) {
  console.log(r.id, r.feedback_log_body?.slice(0, 300));
}

