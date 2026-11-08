import https from 'node:https';
import fs from 'node:fs';

const matchId = 'Y1KH6CB9';

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getMatchHtml() {
  const loginBody = JSON.stringify({
    username: 'CPL_digital_cuder',
    password: '8a7#amQ!'
  });

  const loginRes = await request({
    hostname: 'masterthemachine.tech',
    port: 443,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginBody),
      'Origin': 'https://masterthemachine.tech',
      'Referer': 'https://masterthemachine.tech/login'
    }
  }, loginBody);

  console.log('Login status:', loginRes.statusCode);
  const cookies = (loginRes.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');

  const matchRes = await request({
    hostname: 'masterthemachine.tech',
    port: 443,
    path: `/match/${matchId}`,
    method: 'GET',
    headers: {
      'Cookie': cookies,
      'Accept': 'text/html,application/xhtml+xml,application/json,*/*'
    }
  });

  console.log('Match page status:', matchRes.statusCode);
  fs.writeFileSync(`D:\\mtm\\scratch\\match_${matchId}.html`, matchRes.body, 'utf8');
  console.log(`Saved match HTML (${matchRes.body.length} bytes)`);
}

getMatchHtml();

