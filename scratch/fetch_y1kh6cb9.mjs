import https from 'node:https';
import fs from 'node:fs';

const matchId = 'Y1KH6CB9';

async function fetchMatch() {
  const url = `https://masterthemachine.tech/spectator/${matchId}`;
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      fs.writeFileSync(`D:\\mtm\\scratch\\spectator_${matchId}.html`, data, 'utf8');
      console.log(`Saved spectator HTML (${data.length} bytes)`);
    });
  }).on('error', err => console.error(err));
}

fetchMatch();

