import fs from 'fs';

const BASE_URL = 'https://masterthemachine.tech';
const username = 'CPL_digital_cuder';
const password = '8a7#amQ!';

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
  const setCookie = loginRes.headers.get('set-cookie');
  console.log('Set-Cookie:', setCookie ? setCookie.slice(0, 50) + '...' : 'none');

  const loginJson = await loginRes.json().catch(() => null);
  console.log('Login response:', JSON.stringify(loginJson));

  if (!loginRes.ok) return;

  const cookieHeader = loginRes.headers.getSetCookie 
    ? loginRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
    : (setCookie ? setCookie.split(';')[0] : '');

  console.log('Cookie header:', cookieHeader);

  // Fetch spectator page
  const specRes = await fetch(`${BASE_URL}/spectator/CMSC8VA4`, {
    headers: {
      'Cookie': cookieHeader,
      'User-Agent': 'Mozilla/5.0'
    }
  });

  console.log('Spectator status:', specRes.status);
  const specHtml = await specRes.text();
  fs.writeFileSync('d:/mtm/scratch/spectator_CMSC8VA4.html', specHtml);
  console.log('Wrote spectator HTML, length:', specHtml.length);
}

run().catch(console.error);

