import fs from 'fs';

async function fetchMatch(matchId) {
  const BASE_URL = 'https://masterthemachine.tech';
  const username = 'CPL_digital_cuder';
  const password = '8a7#amQ!';

  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL, 'Referer': `${BASE_URL}/login` },
    body: JSON.stringify({ username, password })
  });
  console.log('Login status:', loginRes.status);
  const cookieHeader = loginRes.headers.getSetCookie 
    ? loginRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
    : (loginRes.headers.get('set-cookie') || '').split(';')[0];

  const specRes = await fetch(`${BASE_URL}/spectator/${matchId}`, {
    headers: { 'Cookie': cookieHeader, 'User-Agent': 'Mozilla/5.0' }
  });
  console.log('Spectator status:', specRes.status);
  const specHtml = await specRes.text();

  let fullText = '';
  for (const match of specHtml.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)) {
    try {
      fullText += JSON.parse(`"${match[1]}"`);
    } catch {
      fullText += match[1];
    }
  }

  const idx = fullText.indexOf('"initialState":');
  let parsedState = null;
  if (idx !== -1) {
    let depth = 0;
    let start = fullText.indexOf('{', idx);
    let end = -1;
    for (let i = start; i < fullText.length; i++) {
      if (fullText[i] === '{') depth++;
      else if (fullText[i] === '}') {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    if (end !== -1) {
      parsedState = JSON.parse(fullText.slice(start, end + 1));
      fs.writeFileSync(`d:/mtm/scratch/state_${matchId}.json`, JSON.stringify(parsedState, null, 2));
    }
  }

  if (parsedState && parsedState.teams) {
    const teamsList = Array.isArray(parsedState.teams) ? parsedState.teams : Object.values(parsedState.teams);
    console.log('Teams:', teamsList.map(t => `${t.teamCode || t.code || t.name}: ${t.teamId || t.id}`));
    const allResults = {};
    const items = ['BUG-01', 'BUG-02', 'BUG-03', 'BUG-04', 'CR-01', 'CR-02', 'CR-03', 'PI-01', 'TASK-03', 'TASK-04'];
    for (const teamObj of teamsList) {
      const teamId = teamObj.teamId || teamObj.id;
      const teamCode = teamObj.teamCode || teamObj.code || teamObj.name || teamId;
      allResults[teamCode] = {};
      for (const item of items) {
        const subUrl = `${BASE_URL}/api/v1/spectator/matches/${matchId}/teams/${teamId}/backlog/${encodeURIComponent(item)}/submission`;
        const subRes = await fetch(subUrl, { headers: { 'Cookie': cookieHeader } });
        const subJson = await subRes.json().catch(e => ({ error: e.message }));
        allResults[teamCode][item] = { status: subRes.status, sub: subJson };
      }
    }
    fs.writeFileSync(`d:/mtm/scratch/sub_${matchId}.json`, JSON.stringify(allResults, null, 2));
    console.log(`Saved d:/mtm/scratch/sub_${matchId}.json`);
  }
}

fetchMatch('38IX07C9').catch(console.error);
