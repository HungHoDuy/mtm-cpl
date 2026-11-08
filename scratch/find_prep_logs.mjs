import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('C:/Users/ADMIN/.codex/logs_2.sqlite', { readOnly: true });
const rows = db.prepare("SELECT * FROM logs WHERE feedback_log_body LIKE '%prepareEnvironment%' ORDER BY id ASC").all();
console.log('Found rows:', rows.length);
for (const r of rows) {
  console.log(r.id, r.feedback_log_body);
}

