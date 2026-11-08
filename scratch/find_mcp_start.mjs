import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('C:/Users/ADMIN/.codex/logs_2.sqlite', { readOnly: true });
const rows = db.prepare("SELECT id, ts, target, feedback_log_body FROM logs WHERE target = 'codex_rmcp_client::stdio_server_launcher' AND id >= 910000 ORDER BY id ASC LIMIT 30").all();
console.log('Earliest MCP rows after 910000:', rows.length);
for (const r of rows) {
  console.log(r.id, r.ts, r.feedback_log_body?.slice(0, 200));
}

