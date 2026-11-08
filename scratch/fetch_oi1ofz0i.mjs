import fs from 'fs';

const BASE_URL = 'https://masterthemachine.tech';
const username = 'CPL_digital_cuder';
const password = '8a7#amQ!';
const matchId = 'OI1OFZ0I';

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
      const parsed = JSON.parse(jsonStr);
      fs.writeFileSync(`d:/mtm/scratch/spectator_${matchId}_initialState.json`, JSON.stringify(parsed, null, 2));
      console.log('Successfully saved initialState!');
    }
  }
}

run().catch(console.error);

