import fs from 'node:fs';

const html = fs.readFileSync('d:/mtm/scratch/spectator_RME543WG.html', 'utf8');
const match = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.*?\});/s) || html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);

if (match) {
  fs.writeFileSync('d:/mtm/scratch/spectator_RME543WG_initialState.json', match[1]);
  console.log('Extracted state json, length:', match[1].length);
  const data = JSON.parse(match[1]);
  console.log('Match info:', data.match ? {
    id: data.match.id,
    status: data.match.status,
    scores: data.match.scoreboard,
    submissionsCount: data.submissions ? data.submissions.length : 0
  } : 'No match object');
} else {
  console.log('Searching for JSON data in HTML...');
  const idx = html.indexOf('{');
  console.log('HTML snippet:', html.slice(0, 500));
}

