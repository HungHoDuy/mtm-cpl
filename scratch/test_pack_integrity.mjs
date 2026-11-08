import fs from 'node:fs';

const content = fs.readFileSync('D:/mtm/team-orchestrator-pack/src/runtime-session.mjs', 'utf8');

console.log('1. Has jsonMatch:', content.includes('const jsonMatch = html.match'));
console.log('2. Has test scaffold guard:', content.includes('Auto-created test scaffold'));
console.log('3. Has test copy in autoLink:', content.includes("lower.endsWith('.test.ts')"));
console.log('4. cardRegex expanded:', content.includes('(?:<\\/div>\\s*<h3|<section\\b)'));

const skillContent = fs.readFileSync('D:/mtm/team-orchestrator-pack/skills/team-orchestrator/SKILL.md', 'utf8');
console.log('5. Has Automated Tests Expansion Rule in SKILL.md:', skillContent.includes('Automated Tests Expansion Rule'));
