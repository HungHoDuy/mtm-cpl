import fs from 'fs';

const BASE_URL = 'https://masterthemachine.tech';
const username = 'CPL_digital_cuder';
const password = '8a7#amQ!';
const matchId = 'ZV98D2FF';

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

  console.log('Login status:', loginRes.status);

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
    const start = fullText.indexOf('{', idx);
    let depth = 0;
    let end = -1;
    for (let i = start; i < fullText.length; i++) {
      if (fullText[i] === '{') depth++;
      else if (fullText[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    if (end !== -1) {
      parsedState = JSON.parse(fullText.substring(start, end));
    }
  }

  if (parsedState) {
    fs.writeFileSync(`d:/mtm/scratch/spectator_${matchId}_state.json`, JSON.stringify(parsedState, null, 2));
    console.log('Successfully saved initialState');
    console.log('Teams:', parsedState.teams?.map(t => ({ id: t.id, name: t.name, score: t.score, rank: t.rank })));
    
    // Fetch submissions for all teams
    const items = ['BUG-01', 'BUG-02', 'BUG-03', 'CR-01', 'PI-01', 'BUG-04', 'CR-02', 'TASK-03', 'CR-03', 'TASK-04'];
    const allResults = {};

    for (const team of parsedState.teams || []) {
      const teamKey = team.name || team.id;
      allResults[teamKey] = {};
      for (const item of items) {
        const subUrl = `${BASE_URL}/api/v1/spectator/matches/${matchId}/teams/${team.id}/backlog/${encodeURIComponent(item)}/submission`;
        try {
          const subRes = await fetch(subUrl, { headers: { 'Cookie': cookieHeader } });
          const subJson = await subRes.json();
          allResults[teamKey][item] = { submission: subJson };
        } catch (e) {
          allResults[teamKey][item] = { error: e.message };
        }
      }
    }

    fs.writeFileSync(`d:/mtm/scratch/submission_details_${matchId}.json`, JSON.stringify(allResults, null, 2));
    console.log(`Saved all submission details to d:/mtm/scratch/submission_details_${matchId}.json`);
  } else {
    console.log('Could not parse initialState from HTML');
  }
}

run().catch(console.error);
