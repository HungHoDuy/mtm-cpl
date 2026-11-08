import fs from 'fs';

const BASE_URL = 'https://masterthemachine.tech';
const username = 'CPL_digital_cuder';
const password = '8a7#amQ!';
const matchId = 'CI0CY6PR';
const teamId = 'b8361640-5140-49a3-97b9-7522c4b698bb';
const items = ['BUG-01', 'BUG-02', 'BUG-03', 'CR-01', 'PI-01', 'BUG-04', 'CR-02', 'TASK-03', 'CR-03', 'TASK-04'];

async function run() {
  const loginRes = await fetch(BASE_URL + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, Referer: BASE_URL + '/login' },
    body: JSON.stringify({ username, password })
  });
  const cookieHeader = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ') : loginRes.headers.get('set-cookie').split(';')[0];
  
  // Fetch spectator page
  const specRes = await fetch(`${BASE_URL}/spectator/${matchId}`, {
    headers: { 'Cookie': cookieHeader, 'User-Agent': 'Mozilla/5.0' }
  });
  const specHtml = await specRes.text();
  fs.writeFileSync(`d:/mtm/scratch/spectator_${matchId}.html`, specHtml);

  // Parse initialState
  let fullText = '';
  for (const match of specHtml.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)) {
    try { fullText += JSON.parse(`"${match[1]}"`); } catch (e) { fullText += match[1]; }
  }
  const idx = fullText.indexOf('"initialState":');
  if (idx !== -1) {
    let depth = 0, start = fullText.indexOf('{', idx), end = -1;
    for (let i = start; i < fullText.length; i++) {
      if (fullText[i] === '{') depth++;
      else if (fullText[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end !== -1) {
      fs.writeFileSync(`d:/mtm/scratch/spectator_${matchId}_initialState.json`, JSON.stringify(JSON.parse(fullText.slice(start, end + 1)), null, 2));
    }
  }

  // Fetch submissions
  const results = {};
  for (const item of items) {
    const subUrl = BASE_URL + '/api/v1/spectator/matches/' + matchId + '/teams/' + teamId + '/backlog/' + encodeURIComponent(item) + '/submission';
    const subRes = await fetch(subUrl, { headers: { Cookie: cookieHeader } });
    results[item] = await subRes.json().catch(e => ({ error: e.message }));
  }
  fs.writeFileSync('d:/mtm/scratch/submission_details_CI0CY6PR.json', JSON.stringify(results, null, 2));
  console.log('Done fetching CI0CY6PR!');
}
run();

