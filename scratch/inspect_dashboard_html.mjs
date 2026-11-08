import fs from 'fs';

const html = fs.readFileSync('D:/mtm/CPL/team-sdlc-pack/logs/ZV98D2FF.dashboard.html', 'utf8');
const scriptMatches = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
console.log('Script tags count:', scriptMatches.length);
scriptMatches.forEach((m, idx) => {
  console.log(`Script #${idx}: length ${m[1].length}, preview: ${m[1].slice(0, 100).replace(/\n/g, ' ')}`);
});

