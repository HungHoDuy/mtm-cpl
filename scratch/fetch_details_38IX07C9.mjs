import fs from 'fs';

const BASE_URL = 'https://masterthemachine.tech';
const username = 'CPL_digital_cuder';
const password = '8a7#amQ!';
const matchId = '38IX07C9';
const teams = {
  CPL: 'b8361640-5140-49a3-97b9-7522c4b698bb'
};

const items = ['BUG-01', 'BUG-02', 'BUG-03', 'CR-01', 'PI-01', 'BUG-04', 'CR-02', 'TASK-03', 'CR-03', 'TASK-04'];

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

  console.log('Login cookie:', cookieHeader);

  const allResults = {};

  for (const [teamCode, teamId] of Object.entries(teams)) {
    allResults[teamCode] = {};
    for (const item of items) {
      console.log(`Fetching details for ${teamCode} ${item}...`);
      const subUrl = `${BASE_URL}/api/v1/spectator/matches/${matchId}/teams/${teamId}/backlog/${encodeURIComponent(item)}/submission`;
      const eviUrl = `${BASE_URL}/api/v1/spectator/matches/${matchId}/teams/${teamId}/backlog/${encodeURIComponent(item)}/evidence`;

      const subRes = await fetch(subUrl, {
        headers: { 'Cookie': cookieHeader }
      });
      const subJson = await subRes.json().catch(err => ({ error: err.message }));

      const eviRes = await fetch(eviUrl, {
        headers: { 'Cookie': cookieHeader }
      });
      const eviJson = await eviRes.json().catch(err => ({ error: err.message }));

      allResults[teamCode][item] = {
        submissionStatus: subRes.status,
        submission: subJson,
        evidenceStatus: eviRes.status,
        evidence: eviJson
      };
    }
  }

  fs.writeFileSync('d:/mtm/scratch/submission_details_38IX07C9.json', JSON.stringify(allResults, null, 2));
  console.log('Saved all details to d:/mtm/scratch/submission_details_38IX07C9.json');
}

run().catch(console.error);

