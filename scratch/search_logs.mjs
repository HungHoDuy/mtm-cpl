import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('C:/Users/ADMIN/.codex/logs_2.sqlite', { readOnly: true });
const rows = db.prepare("SELECT * FROM logs WHERE message LIKE '%prepareEnvironment%' OR message LIKE '%Cascade%' ORDER BY id DESC LIMIT 50").all();
console.log('Found rows:', rows.length);
for (const r of rows) {
  console.log(r.timestamp, r.level, r.message?.slice(0, 200));
}

