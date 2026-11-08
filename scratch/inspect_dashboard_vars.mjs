import fs from 'fs';

const html = fs.readFileSync('D:/mtm/CPL/team-sdlc-pack/logs/ZV98D2FF.dashboard.html', 'utf8');

// Find all JSON blocks or variable declarations
const varMatches = [...html.matchAll(/(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(\[[\s\S]*?\]|\{[\s\S]*?\});/g)];
console.log('Variables found:', varMatches.length);
varMatches.forEach(m => {
  console.log(`Var name: ${m[1]}, length: ${m[2].length}`);
});

