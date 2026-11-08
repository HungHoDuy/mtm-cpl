import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('C:/Users/ADMIN/.codex/logs_2.sqlite', { readOnly: true });
const max = db.prepare("SELECT max(id) as maxId, min(id) as minId FROM logs").get();
console.log('ID range:', max);

const last = db.prepare("SELECT id, ts, target, feedback_log_body FROM logs ORDER BY id DESC LIMIT 5").all();
console.log('Last rows:', last);

