import { execSync } from 'node:child_process';

const psql = 'C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe';
const resetSql = `
  SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'freelanceos_test' AND pid <> pg_backend_pid();
  DROP DATABASE IF EXISTS freelanceos_test;
  CREATE DATABASE freelanceos_test OWNER freelanceos;
`;

try {
  const out = execSync(`"${psql}" -U freelanceos -p 5433 -h 127.0.0.1 -d postgres -c "${resetSql.replace(/\r?\n/g, ' ')}"`, {
    env: { ...process.env, PGPASSWORD: 'freelanceos_secret' },
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  console.log('SUCCESS:', out);
} catch (e) {
  console.log('FAIL:', e.message);
  if (e.stderr) console.log('STDERR:', e.stderr.toString());
}

