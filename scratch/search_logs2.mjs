import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('C:/Users/ADMIN/.codex/logs_2.sqlite', { readOnly: true });
const rows = db.prepare("SELECT * FROM logs WHERE feedback_log_body LIKE '%prepareEnvironment%' OR feedback_log_body LIKE '%Cascade%' OR feedback_log_body LIKE '%MTM MCP%' ORDER BY id DESC LIMIT 50").all();
console.log('Found rows:', rows.length);
for (const r of rows) {
  console.log(r.id, r.level, r.target, r.feedback_log_body?.slice(0, 300));
}

