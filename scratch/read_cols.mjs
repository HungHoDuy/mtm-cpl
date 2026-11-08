import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('C:/Users/ADMIN/.codex/logs_2.sqlite', { readOnly: true });
const cols = db.prepare("PRAGMA table_info(logs)").all();
console.log('Columns:', cols);

