import fs from 'fs';

const BASE_URL = 'https://masterthemachine.tech';
const username = 'CPL_digital_cuder';
const password = '8a7#amQ!';
const matchId = 'OI1OFZ0I';
const teamId = 'b8361640-5140-49a3-97b9-7522c4b698bb';

async function run() {
  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': BASE_URL,
      'Referer': `${BASE_URL}/login`
    },
    body: JSON.stringify({ username, password })
  });

  const cookieHeader = loginRes.headers.getSetCookie 
    ? loginRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
    : loginRes.headers.get('set-cookie').split(';')[0];

  const subUrl = `${BASE_URL}/api/v1/spectator/matches/${matchId}/teams/${teamId}/backlog/CR-01/submission`;
  const eviUrl = `${BASE_URL}/api/v1/spectator/matches/${matchId}/teams/${teamId}/backlog/CR-01/evidence`;

  const subRes = await fetch(subUrl, { headers: { 'Cookie': cookieHeader } });
  const subJson = await subRes.json().catch(err => ({ error: err.message }));

  const eviRes = await fetch(eviUrl, { headers: { 'Cookie': cookieHeader } });
  const eviJson = await eviRes.json().catch(err => ({ error: err.message }));

  fs.writeFileSync('d:/mtm/scratch/cr01_oi1ofz0i_grader.json', JSON.stringify({
    submissionStatus: subRes.status,
    submission: subJson,
    evidenceStatus: eviRes.status,
    evidence: eviJson
  }, null, 2));

  console.log('Saved cr01_oi1ofz0i_grader.json');
}

run().catch(console.error);

