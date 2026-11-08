import fs from 'fs';

async function getTimes() {
  const loginRes = await fetch('https://masterthemachine.tech/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://masterthemachine.tech', Referer: 'https://masterthemachine.tech/login' },
    body: JSON.stringify({ username: 'CPL_digital_cuder', password: '8a7#amQ!' })
  });
  const cookie = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ') : loginRes.headers.get('set-cookie');
  const items = ['BUG-01', 'BUG-02', 'BUG-03', 'CR-01', 'PI-01', 'BUG-04', 'CR-02', 'TASK-03', 'CR-03', 'TASK-04'];
  const submissions = [];
  for (const item of items) {
    const url = `https://masterthemachine.tech/api/v1/spectator/matches/ZV98D2FF/teams/b8361640-5140-49a3-97b9-7522c4b698bb/backlog/${encodeURIComponent(item)}/submission`;
    const res = await fetch(url, { headers: { Cookie: cookie } });
    const json = await res.json();
    submissions.push({
      item,
      startedAt: json.backlog?.startedAt || json.startedAt,
      submittedAt: json.submission?.createdAt || json.submittedAt || json.submission?.submittedAt,
      points: json.grader?.points
    });
  }
  console.log('Submissions:');
  console.log(JSON.stringify(submissions, null, 2));
}
getTimes();

