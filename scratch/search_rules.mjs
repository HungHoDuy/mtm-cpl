import fs from 'fs';

const r1 = fs.readFileSync('D:/mtm/docs/01_GAME_RULES_AND_SCORING.md', 'utf8');
const r3 = fs.readFileSync('D:/mtm/docs/03_TEAM_ORCHESTRATOR_TECHNICAL_GUIDE.md', 'utf8');

console.log('--- 01_GAME_RULES_AND_SCORING.md ---');
r1.split('\n').forEach((l, i) => {
  if (l.match(/prepare|preparation|stack|framework|technology|violation|penalty|disqualification|rule/i)) {
    if (l.length < 140) console.log(`L${i+1}: ${l.trim()}`);
  }
});

console.log('\n--- 03_TEAM_ORCHESTRATOR_TECHNICAL_GUIDE.md ---');
r3.split('\n').forEach((l, i) => {
  if (l.match(/prepare|preparation|stack|framework|technology|violation|penalty|disqualification|rule/i)) {
    if (l.length < 140) console.log(`L${i+1}: ${l.trim()}`);
  }
});

