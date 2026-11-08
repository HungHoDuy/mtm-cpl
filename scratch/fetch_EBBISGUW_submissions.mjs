import fs from 'fs';

const BASE_URL = 'https://masterthemachine.tech';
const username = 'CPL_digital_cuder';
const password = '8a7#amQ!';
const matchId = 'EBBISGUW';

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
    : (loginRes.headers.get('set-cookie') || '').split(';')[0];

  const state = JSON.parse(fs.readFileSync('d:/mtm/scratch/spectator_EBBISGUW_initialState.json', 'utf8'));

  const items = [
    'TASK-08', 'BUG-09', 'CR-07', 'BUG-11', 'PI-02', 'TASK-10',
    'TASK-05', 'TASK-12', 'PI-03', 'TASK-06', 'TASK-07', 'TASK-11'
  ];

  const allResults = {};

  for (const team of state.teams) {
    if (team.teamCode !== 'CPL' && team.teamCode !== 'MS5') continue;
    allResults[team.teamCode] = {};

    for (const item of items) {
      console.log(`Fetching details for ${team.teamCode} ${item}...`);
      const subUrl = `${BASE_URL}/api/v1/spectator/matches/${matchId}/teams/${team.teamId}/backlog/${encodeURIComponent(item)}/submission`;
      const eviUrl = `${BASE_URL}/api/v1/spectator/matches/${matchId}/teams/${team.teamId}/backlog/${encodeURIComponent(item)}/evidence`;

      const subRes = await fetch(subUrl, { headers: { 'Cookie': cookieHeader } });
      const subJson = await subRes.json().catch(err => ({ error: err.message }));

      const eviRes = await fetch(eviUrl, { headers: { 'Cookie': cookieHeader } });
      const eviJson = await eviRes.json().catch(err => ({ error: err.message }));

      allResults[team.teamCode][item] = {
        submissionStatus: subRes.status,
        submission: subJson,
        evidenceStatus: eviRes.status,
        evidence: eviJson
      };
    }
  }

  fs.writeFileSync('d:/mtm/scratch/submission_details_EBBISGUW.json', JSON.stringify(allResults, null, 2));
  console.log('Saved submission details to d:/mtm/scratch/submission_details_EBBISGUW.json');
}

run().catch(console.error);

