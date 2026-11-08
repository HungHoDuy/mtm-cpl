import { RuntimeSession } from '../team-orchestrator-pack/src/runtime-session.mjs';
import fs from 'node:fs';

const s = new RuntimeSession();
s.matchId = 'CI0CY6PR';
await s.loginMatch();

const url = new URL('/spectator/CI0CY6PR', s.gameMasterUrl);
const res = await s.rawRequest({
  protocol: url.protocol,
  hostname: url.hostname,
  port: url.port || 443,
  path: url.pathname + url.search,
  method: 'GET',
  headers: {
    'Accept': 'text/html,application/xhtml+xml,application/json,*/*',
    'Cookie': s.getCookieHeader(url)
  }
});

fs.writeFileSync('D:/mtm/scratch/spectator-auth.html', res.body);

const m = res.body.match(/\\"cells\\":(\[[\s\S]*?\])(?:,\\"submitted\\")/);
if (m) {
  let str = m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  const cells = JSON.parse(str);
  for (const c of cells) {
    console.log(`${c.backlogItemKey.padEnd(8)} | Points: ${String(c.points).padEnd(5)} | GraderPoints: ${String(c.graderPoints).padEnd(5)} | Verdict: ${c.verdict || 'none'} | ScoreStatus: ${c.scoreStatus}`);
  }
}

