import * as fs from 'node:fs';
import * as path from 'node:path';

// Parse .env from CPL_2
const envPath = 'D:/mtm/CPL_2/.env';
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq !== -1) {
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

import { RuntimeSession } from 'file:///D:/mtm/CPL_2/team-sdlc-pack/src/runtime-session.mjs';
const s = new RuntimeSession();
console.log('Username loaded from env:', s.username, 'Password:', s.password ? 'SET' : 'EMPTY');

await s.configureSession({
  matchId: 'KZC40VZW',
  matchUuid: 'KZC40VZW',
  teamId: 'CPL',
  checkoutRoot: 'D:/mtm/CPL_2/matches/KZC40VZW',
  progressLogFile: 'D:/mtm/CPL_2/team-sdlc-pack/logs/KZC40VZW.progress.ndjson',
  teamSdlcPackWorkspace: 'D:/mtm/CPL_2/team-sdlc-pack'
});

const res = await s.refreshMatch();
console.log('refreshMatch result with .env loaded:');
console.log('Backlog count:', res.backlogCount);
console.log('Items:', res.items.map(i => i.key + ': ' + i.status + ' (' + i.points + ' pts)'));

// Also test getNextTask
const task = await s.getNextTask();
console.log('getNextTask result:', task.hasTask ? `${task.item.key} (${task.item.title})` : task.message);

