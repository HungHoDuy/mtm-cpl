import fs from 'node:fs';
import { RuntimeSession } from 'file:///D:/mtm/CPL_2/team-sdlc-pack/src/runtime-session.mjs';

const html = fs.readFileSync('D:/mtm/scratch/match_Y1KH6CB9.html', 'utf8');

const session = new RuntimeSession({
  matchId: 'Y1KH6CB9',
  gameMasterUrl: 'https://masterthemachine.tech',
  apiKey: 'test-key',
  teamApiKey: 'test-team-key'
});

// Mock rawRequest to return 200 with captured HTML
session.rawRequest = async () => {
  return { statusCode: 200, headers: {}, body: html };
};

const res = await session.refreshMatch();
console.log('RefreshMatch output count:', res.backlogCount);
console.log('Items sorted by urgency:');
res.items.forEach((it, idx) => {
  console.log(`[#${idx}] ${it.key}: status=${it.status}, points=${it.points}, hasDeadline=${it.hasDeadline}, dlMins=${it.deadlineMinutes}, title="${it.title}"`);
});
