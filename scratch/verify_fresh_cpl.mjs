import fs from 'node:fs';
import path from 'node:path';

const target = 'D:/mtm/CPL';

console.log('--- Verifying D:/mtm/CPL Installation ---');

// 1. Directory Structure
const expectedDirs = [
  'matches',
  'team-sdlc-pack',
  'team-sdlc-pack/runtime',
  'team-sdlc-pack/src',
  '.codex',
  '.codex/agents',
  '.agents/skills',
  '.agents/skills/team-orchestrator',
  '.mtm'
];

expectedDirs.forEach(d => {
  const p = path.resolve(target, d);
  console.log(`Directory ${d}: ${fs.existsSync(p) ? 'OK' : 'MISSING'}`);
});

// 2. Runtime Session
const runtimeFile = path.resolve(target, 'team-sdlc-pack/src/runtime-session.mjs');
const runtimeContent = fs.readFileSync(runtimeFile, 'utf8');
console.log('\n--- Runtime Session Checks ---');
console.log('Has SSR JSON parser:', runtimeContent.includes('const jsonMatch = html.match'));
console.log('Has test scaffold guard:', runtimeContent.includes('Auto-created test scaffold'));
console.log('Has test copy in autoLink:', runtimeContent.includes("lower.endsWith('.test.ts')"));
console.log('Has expanded cardRegex:', runtimeContent.includes('(?:<\\/div>\\s*<h3|<section\\b)'));

// 3. SKILL.md
const skillFile = path.resolve(target, '.agents/skills/team-orchestrator/SKILL.md');
const skillContent = fs.readFileSync(skillFile, 'utf8');
console.log('\n--- SKILL.md Checks ---');
console.log('Has Automated Tests Expansion Rule:', skillContent.includes('Automated Tests Expansion Rule'));

// 4. Codex Config
const codexFile = path.resolve(target, '.codex/config.toml');
const codexContent = fs.readFileSync(codexFile, 'utf8');
console.log('\n--- Codex Config Checks ---');
console.log('Has mtm_helper server:', codexContent.includes('mtm_helper'));
console.log('Path correctly points to D:/mtm/CPL:', codexContent.includes('D:/mtm/CPL/team-sdlc-pack/bin/runtime-server.mjs'));

// 5. Environment
const envFile = path.resolve(target, '.env');
console.log('\n--- Environment Checks ---');
console.log('.env exists in CPL:', fs.existsSync(envFile));
console.log('.env exists in team-sdlc-pack:', fs.existsSync(path.resolve(target, 'team-sdlc-pack/.env')));

console.log('\n=== ALL CHECKS COMPLETED ===');

