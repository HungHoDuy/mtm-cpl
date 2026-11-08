import fs from 'fs';

const BASE_URL = 'https://masterthemachine.tech';
const username = 'CPL_digital_cuder';
const password = '8a7#amQ!';
const matchId = '4LOWC0I2';

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

  console.log('Login status:', loginRes.status);
  const cookieHeader = loginRes.headers.getSetCookie 
    ? loginRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
    : (loginRes.headers.get('set-cookie') || '').split(';')[0];

  // Fetch spectator page
  const specRes = await fetch(`${BASE_URL}/spectator/${matchId}`, {
    headers: {
      'Cookie': cookieHeader,
      'User-Agent': 'Mozilla/5.0'
    }
  });

  console.log('Spectator status:', specRes.status);
  const specHtml = await specRes.text();
  fs.writeFileSync(`d:/mtm/scratch/spectator_${matchId}.html`, specHtml);
  console.log('Saved spectator HTML, length:', specHtml.length);

  // Parse initialState
  let fullText = '';
  for (const match of specHtml.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)) {
    try {
      const decoded = JSON.parse(`"${match[1]}"`);
      fullText += decoded;
    } catch (e) {
      fullText += match[1];
    }
  }

  let parsedState = null;
  const idx = fullText.indexOf('"initialState":');
  if (idx !== -1) {
    let depth = 0;
    let start = fullText.indexOf('{', idx);
    let end = -1;
    for (let i = start; i < fullText.length; i++) {
      if (fullText[i] === '{') depth++;
      else if (fullText[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end !== -1) {
      const jsonStr = fullText.slice(start, end + 1);
      parsedState = JSON.parse(jsonStr);
      fs.writeFileSync(`d:/mtm/scratch/spectator_${matchId}_initialState.json`, JSON.stringify(parsedState, null, 2));
      console.log('Successfully saved initialState!');
    }
  }

  // Find teams
  if (parsedState && parsedState.teams) {
    console.log('Teams:', Object.keys(parsedState.teams).map(t => `${parsedState.teams[t].name || parsedState.teams[t].code || t}: ${t}`));
    const items = ['BUG-01', 'BUG-02', 'BUG-03', 'CR-01', 'PI-01', 'BUG-04', 'CR-02', 'TASK-03', 'CR-03', 'TASK-04'];
    const allResults = {};

    for (const [teamId, teamObj] of Object.entries(parsedState.teams)) {
      const teamCode = teamObj.code || teamObj.name || teamId;
      allResults[teamCode] = {};
      for (const item of items) {
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
    fs.writeFileSync(`d:/mtm/scratch/submission_details_${matchId}.json`, JSON.stringify(allResults, null, 2));
    console.log(`Saved all details to d:/mtm/scratch/submission_details_${matchId}.json`);
  }
}

run().catch(console.error);

