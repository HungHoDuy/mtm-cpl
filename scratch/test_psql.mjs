import { execSync } from 'node:child_process';

const psqlCandidates = [
  'C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe',
  'C:\\Program Files\\PostgreSQL\\15\\bin\\psql.exe',
  'psql'
];

let selectedPsql = null;
for (const cand of psqlCandidates) {
  try {
    const out = execSync(`"${cand}" --version`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    selectedPsql = cand;
    console.log(`psql candidate [${cand}] succeeded:`, out.trim());
    break;
  } catch (err) {
    // try next
  }
}

if (!selectedPsql) {
  console.error('No psql executable found!');
} else {
  // Test connection to postgres port 5433
  try {
    const env = { ...process.env, PGPASSWORD: 'freelanceos_secret' };
    const query = `
      SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'freelanceos_test' AND pid <> pg_backend_pid();
      DROP DATABASE IF EXISTS freelanceos_test;
      CREATE DATABASE freelanceos_test OWNER freelanceos;
    `;
    const res = execSync(`"${selectedPsql}" -U freelanceos -p 5433 -h 127.0.0.1 -d postgres -c "${query}"`, {
      env,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log('Drop & Create result:');
    console.log(res);
  } catch (dbErr) {
    console.error('Database connection test failed:', dbErr.message);
  }
}
