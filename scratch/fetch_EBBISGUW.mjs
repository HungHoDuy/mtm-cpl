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

  console.log('Login status:', loginRes.status);
  const cookieHeader = loginRes.headers.getSetCookie 
    ? loginRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
    : (loginRes.headers.get('set-cookie') || '').split(';')[0];

  const specRes = await fetch(`${BASE_URL}/spectator/${matchId}`, {
    headers: {
      'Cookie': cookieHeader,
      'User-Agent': 'Mozilla/5.0'
    }
  });

  console.log('Spectator status:', specRes.status);
  const specHtml = await specRes.text();
  fs.writeFileSync('d:/mtm/scratch/spectator_EBBISGUW.html', specHtml);

  // Extract Next.js script chunks
  let fullText = '';
  for (const match of specHtml.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)) {
    try {
      const decoded = JSON.parse('"' + match[1] + '"');
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
      fs.writeFileSync('d:/mtm/scratch/spectator_EBBISGUW_initialState.json', JSON.stringify(parsedState, null, 2));
      console.log('Successfully saved initialState!');
    }
  }

  // Also check match API directly if available
  const matchRes = await fetch(`${BASE_URL}/api/v1/spectator/matches/${matchId}`, {
    headers: { 'Cookie': cookieHeader }
  });
  console.log('Match API status:', matchRes.status);
  if (matchRes.ok) {
    const matchData = await matchRes.json();
    fs.writeFileSync('d:/mtm/scratch/spectator_EBBISGUW_match.json', JSON.stringify(matchData, null, 2));
    console.log('Saved match json');
  }

  // If teams are found, fetch all backlog items for each team
  if (parsedState && parsedState.teams) {
    console.log('Teams in parsedState:');
    const allResults = {};
    for (const [teamId, teamObj] of Object.entries(parsedState.teams)) {
      const teamCode = teamObj.code || teamObj.name || teamId;
      console.log(`Team: ${teamCode} (${teamId}) - Score: ${teamObj.totalScore || teamObj.score}`);
      allResults[teamCode] = {};

      // Determine task items from backlog if available, or fetch common items
      const backlogKeys = teamObj.backlog ? Object.keys(teamObj.backlog) : [];
      console.log(`Backlog keys for ${teamCode}:`, backlogKeys);
      
      const itemsToFetch = new Set([
        ...backlogKeys,
        'BUG-09', 'BUG-11', 'CR-07', 'PI-02', 'PI-03', 'TASK-05', 'TASK-06', 'TASK-07', 'TASK-08', 'TASK-10', 'TASK-11', 'TASK-12',
        'BUG-01', 'BUG-02', 'BUG-03', 'BUG-04', 'CR-01', 'CR-02', 'CR-03', 'PI-01'
      ]);

      for (const item of itemsToFetch) {
        const subUrl = `${BASE_URL}/api/v1/spectator/matches/${matchId}/teams/${teamId}/backlog/${encodeURIComponent(item)}/submission`;
        const eviUrl = `${BASE_URL}/api/v1/spectator/matches/${matchId}/teams/${teamId}/backlog/${encodeURIComponent(item)}/evidence`;

        const subRes = await fetch(subUrl, { headers: { 'Cookie': cookieHeader } });
        let subJson = null;
        if (subRes.ok) {
          subJson = await subRes.json().catch(err => ({ error: err.message }));
        }

        const eviRes = await fetch(eviUrl, { headers: { 'Cookie': cookieHeader } });
        let eviJson = null;
        if (eviRes.ok) {
          eviJson = await eviRes.json().catch(err => ({ error: err.message }));
        }

        if (subJson || eviJson) {
          allResults[teamCode][item] = {
            submissionStatus: subRes.status,
            submission: subJson,
            evidenceStatus: eviRes.status,
            evidence: eviJson
          };
        }
      }
    }
    fs.writeFileSync('d:/mtm/scratch/submission_details_EBBISGUW.json', JSON.stringify(allResults, null, 2));
    console.log('Saved submission details to d:/mtm/scratch/submission_details_EBBISGUW.json');
  }
}

run().catch(console.error);

