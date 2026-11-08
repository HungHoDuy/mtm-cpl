import https from 'node:https';
import fs from 'node:fs';

const matchId = '38IX07C9';
const apiKey = process.env.TEAM_API_KEY || 'cpl_secret_key_2026';

function get(path) {
  return new Promise((resolve, reject) => {
    https.get(`https://masterthemachine.tech${path}`, {
      headers: {
        'x-team-key': apiKey,
        'User-Agent': 'MTM-Analysis/1.0'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const match = await get(`/api/v1/spectator/${matchId}`);
  fs.writeFileSync('d:/mtm/scratch/spectator_38IX07C9.json', JSON.stringify(match, null, 2));

  console.log('Match Status:', match.status);
  console.log('Total Score:', match.totalScore);
  if (match.submissions) {
    console.log('Submissions Count:', match.submissions.length);
    for (const sub of match.submissions) {
      console.log(`\n=== Sub: ${sub.backlogKey || sub.backlogId} | Score: ${sub.score} | Status: ${sub.status} ===`);
      if (sub.feedback) {
        console.log('Feedback:', typeof sub.feedback === 'string' ? sub.feedback : JSON.stringify(sub.feedback, null, 2));
      }
      if (sub.testCases || sub.evaluation?.testCases) {
        console.log('TCs:', JSON.stringify(sub.testCases || sub.evaluation?.testCases, null, 2));
      }
    }
  } else if (match.backlogs) {
    for (const b of match.backlogs) {
      console.log(`\n=== Backlog: ${b.key} | Status: ${b.status} | Points: ${b.points} | Score: ${b.score} ===`);
    }
  }
}

main().catch(console.error);

