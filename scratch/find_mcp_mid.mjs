import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('C:/Users/ADMIN/.codex/logs_2.sqlite', { readOnly: true });
const count = db.prepare("SELECT count(*) as c FROM logs WHERE target = 'codex_rmcp_client::stdio_server_launcher' AND id < 921000 AND id > 835000").get();
console.log('Count:', count);

const rows = db.prepare("SELECT id, ts, feedback_log_body FROM logs WHERE target = 'codex_rmcp_client::stdio_server_launcher' AND id < 921000 AND id > 835000 ORDER BY id ASC LIMIT 10").all();
for (const r of rows) {
  console.log(r.id, r.ts, r.feedback_log_body?.slice(0, 150));
}

