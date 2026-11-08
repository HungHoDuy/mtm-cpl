import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('C:/Users/ADMIN/.codex/logs_2.sqlite', { readOnly: true });
const row = db.prepare("SELECT id, ts, feedback_log_body FROM logs WHERE target = 'codex_rmcp_client::stdio_server_launcher' AND ts > 1793852000 ORDER BY id ASC LIMIT 20").all();
console.log('Rows after 1793852000:', row.length);
for (const r of row) {
  console.log(r.id, r.ts, r.feedback_log_body?.slice(0, 150));
}

