#!/usr/bin/env node
/**
 * MTM Team Orchestrator Pack Distribution Verifier
 * Pure Node.js Standard Library (0 external npm dependencies)
 * Validates pack file integrity, configuration schemas, and script syntax.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packRoot = path.resolve(__dirname, '..');

let errors = 0;

function report(status, msg) {
  const icon = status ? '✓' : '✗';
  console.log(`[${icon}] ${msg}`);
  if (!status) errors++;
}

console.log('======================================================');
console.log(' MTM Distribution Check: Verifying Team Pack Files');
console.log('======================================================');
console.log(`Pack Root: ${packRoot}\n`);

// 1. Verify package.json
const pkgPath = path.resolve(packRoot, 'package.json');
if (!fs.existsSync(pkgPath)) {
  report(false, 'package.json missing');
} else {
  report(true, 'package.json exists');
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    report(true, `package.json parsed successfully (${pkg.name}@${pkg.version})`);
  } catch (err) {
    report(false, `package.json JSON syntax error: ${err.message}`);
  }
}

// 2. Verify team-pack-info.json
const infoPath = path.resolve(packRoot, 'team-pack-info.json');
if (!fs.existsSync(infoPath)) {
  report(false, 'team-pack-info.json missing');
} else {
  try {
    const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
    const valid = info.schemaVersion === 1 && Boolean(info.teamId) && Boolean(info.teamName);
    report(valid, `team-pack-info.json valid: Team '${info.teamId}' (${info.teamName})`);
  } catch (err) {
    report(false, `team-pack-info.json JSON syntax error: ${err.message}`);
  }
}

// 3. Verify team-runtime.json
const runtimePath = path.resolve(packRoot, 'team-runtime.json');
if (!fs.existsSync(runtimePath)) {
  report(false, 'team-runtime.json missing');
} else {
  try {
    const rt = JSON.parse(fs.readFileSync(runtimePath, 'utf8'));
    const valid = rt.schemaVersion === 1 && rt.provider === 'codex';
    report(valid, `team-runtime.json valid (provider: ${rt.provider}, entrypoint: ${rt.entrypoint?.rootAgentType})`);
  } catch (err) {
    report(false, `team-runtime.json JSON syntax error: ${err.message}`);
  }
}

// 4. Verify contracts
const contracts = [
  'contracts/agent-result.schema.json',
  'contracts/progress-event.schema.json'
];
for (const c of contracts) {
  const cPath = path.resolve(packRoot, c);
  if (fs.existsSync(cPath) && fs.statSync(cPath).size > 0) {
    try {
      JSON.parse(fs.readFileSync(cPath, 'utf8'));
      report(true, `${c} exists and is valid JSON`);
    } catch (err) {
      report(false, `${c} invalid JSON: ${err.message}`);
    }
  } else {
    report(false, `${c} is missing or empty`);
  }
}

// 5. Verify core code files
const codeFiles = [
  'src/runtime-session.mjs',
  'bin/runtime-server.mjs',
  'scripts/install.mjs',
  'scripts/check-distribution.mjs'
];
for (const f of codeFiles) {
  const fPath = path.resolve(packRoot, f);
  if (!fs.existsSync(fPath) || fs.statSync(fPath).size === 0) {
    report(false, `${f} is missing or empty`);
  } else {
    try {
      execSync(`node --check "${fPath}"`, { stdio: 'pipe' });
      report(true, `${f} syntax valid`);
    } catch (err) {
      report(false, `${f} syntax error: ${(err.stderr || err.message).toString().trim()}`);
    }
  }
}

// 6. Verify config/codex.toml
const tomlPath = path.resolve(packRoot, 'config/codex.toml');
if (fs.existsSync(tomlPath) && fs.statSync(tomlPath).size > 0) {
  const content = fs.readFileSync(tomlPath, 'utf8');
  const hasServer = content.includes('[mcp_servers.mtm_helper]');
  report(hasServer, 'config/codex.toml defines [mcp_servers.mtm_helper]');
} else {
  report(false, 'config/codex.toml is missing or empty');
}

// 7. Verify Agent Profiles (agents/*.toml)
const agentProfiles = [
  'agents/team-orchestrator.toml',
  'agents/team-business-analyst.toml',
  'agents/team-developer.toml',
  'agents/team-tester.toml',
  'agents/team-cyber-security.toml'
];
for (const a of agentProfiles) {
  const aPath = path.resolve(packRoot, a);
  if (fs.existsSync(aPath) && fs.statSync(aPath).size > 100) {
    const content = fs.readFileSync(aPath, 'utf8');
    const hasName = content.includes('name =');
    const hasInstructions = content.includes('developer_instructions =') || content.includes('instructions =');
    report(hasName && hasInstructions, `${a} valid profile (name & instructions present)`);
  } else {
    report(false, `${a} is missing or incomplete (< 100 bytes)`);
  }
}

// 8. Verify Skills (skills/*/SKILL.md)
const skillFiles = [
  'skills/game-preparation/SKILL.md',
  'skills/team-orchestrator/SKILL.md',
  'skills/team-recovery/SKILL.md'
];
for (const s of skillFiles) {
  const sPath = path.resolve(packRoot, s);
  if (fs.existsSync(sPath) && fs.statSync(sPath).size > 200) {
    const content = fs.readFileSync(sPath, 'utf8');
    const hasFrontmatter = content.startsWith('---') && content.includes('name:') && content.includes('description:');
    report(hasFrontmatter, `${s} valid skill (frontmatter & content present)`);
  } else {
    report(false, `${s} is missing or empty`);
  }
}

console.log('\n======================================================');
if (errors === 0) {
  console.log(' [SUCCESS] Distribution check passed with 0 errors.');
  console.log('======================================================');
  process.exit(0);
} else {
  console.error(` [FAILED] Distribution check failed with ${errors} error(s).`);
  console.log('======================================================');
  process.exit(1);
}
