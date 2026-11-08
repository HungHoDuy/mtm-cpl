import fs from 'fs';

async function main() {
  const BASE_URL = 'https://masterthemachine.tech';
  const username = 'CPL_digital_cuder';
  const password = '8a7#amQ!';

  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const cookieHeader = loginRes.headers.getSetCookie 
    ? loginRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
    : (loginRes.headers.get('set-cookie') || '').split(';')[0];

  const matchId = '38IX07C9';
  const teamId = 'b8361640-5140-49a3-97b9-7522c4b698bb';

  // Let's test different potential submission detail endpoints:
  const candidateUrls = [
    `/api/v1/spectator/${matchId}/teams/${teamId}`,
    `/api/v1/matches/${matchId}/teams/${teamId}/submissions`,
    `/api/v1/spectator/matches/${matchId}/teams/${teamId}/backlog/BUG-01/submission`,
    `/api/v1/spectator/matches/${matchId}/teams/${teamId}/backlog/BUG-02/submission`,
    `/api/v1/spectator/matches/${matchId}/submissions`,
    `/api/v1/spectator/matches/${matchId}/evaluations`,
    `/api/v1/spectator/matches/${matchId}/cells`,
    `/api/v1/spectator/matches/${matchId}/team/${teamId}`
  ];

  for (const url of candidateUrls) {
    const res = await fetch(`${BASE_URL}${url}`, { headers: { 'Cookie': cookieHeader } });
    console.log(`${url} -> ${res.status}`);
    if (res.status === 200) {
      const text = await res.text();
      console.log('  Response:', text.slice(0, 300));
      fs.writeFileSync(`d:/mtm/scratch/endpoint_${url.replace(/[\/:]/g, '_')}.json`, text);
    }
  }
}

main().catch(console.error);

