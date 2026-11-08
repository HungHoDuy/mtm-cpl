import fs from 'node:fs';

const content = fs.readFileSync('./team-orchestrator-pack/src/runtime-session.mjs', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  const m = line.match(/^\s*(async\s+)?([a-zA-Z0-9_]+)\s*\(/);
  if (m && !line.includes('if (') && !line.includes('for (') && !line.includes('switch (') && !line.includes('while (')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});

