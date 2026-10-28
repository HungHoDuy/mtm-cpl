#!/usr/bin/env node
/**
 * MTM Team Orchestrator Pack Installer & Workspace Provisioner
 * Pure Node.js Standard Library (0 external npm dependencies)
 * Fully provisions <TeamWorkspace> to satisfy:
 *   - validateTeamWorkspaceLayout() -> matches/, team-sdlc-pack/
 *   - verifyInstalled() -> team-sdlc-pack/runtime/, .mtm/, .codex/
 *   - Codex CLI -> .codex/config.toml, .codex/agents/, .agents/skills/
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packRoot = path.resolve(__dirname, '..');

function parseArgs() {
  const args = process.argv.slice(2);
  let target = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--target' || args[i] === '-t') {
      target = args[i + 1] || '';
      i++;
    } else if (args[i].startsWith('--target=')) {
      target = args[i].split('=')[1];
    }
  }
  if (!target) {
    target = path.resolve(packRoot, '..', 'CPL');
  }
  return path.resolve(target);
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function install() {
  const targetWorkspace = parseArgs();
  console.log('======================================================');
  console.log('  MTM Team Pack Automated Workspace Provisioner');
  console.log('======================================================');
  console.log(`[MTM Installer] Source Pack Root:  ${packRoot}`);
  console.log(`[MTM Installer] Target Workspace:  ${targetWorkspace}`);

  // 1. Provision Skeleton Directories
  const matchesDir = path.resolve(targetWorkspace, 'matches');
  const mtmDir = path.resolve(targetWorkspace, '.mtm');
  const codexDir = path.resolve(targetWorkspace, '.codex');
  const codexAgentsDir = path.resolve(codexDir, 'agents');
  const agentsSkillsDir = path.resolve(targetWorkspace, '.agents', 'skills');
  const targetPackDir = path.resolve(targetWorkspace, 'team-sdlc-pack');
  const runtimeDir = path.resolve(targetPackDir, 'runtime');
  const logsDir = path.resolve(targetPackDir, 'logs');

  const requiredDirs = [
    matchesDir,
    mtmDir,
    codexAgentsDir,
    agentsSkillsDir,
    runtimeDir,
    logsDir
  ];

  for (const dir of requiredDirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
  console.log('[MTM Installer] [✓] Workspace directory skeleton created.');

  // 2. Deploy Runtime Payload into team-sdlc-pack/runtime/ and team-sdlc-pack/
  const itemsToCopy = [
    'agents',
    'bin',
    'config',
    'contracts',
    'docs',
    'scripts',
    'skills',
    'src',
    'install.ps1',
    'package.json',
    'README.md',
    'team-pack-info.json',
    'team-runtime.json'
  ];

  for (const item of itemsToCopy) {
    const srcPath = path.resolve(packRoot, item);
    const destRuntimePath = path.resolve(runtimeDir, item);
    const destRootPath = path.resolve(targetPackDir, item);

    if (!fs.existsSync(srcPath)) continue;

    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDirectory(srcPath, destRuntimePath);
      copyDirectory(srcPath, destRootPath);
    } else {
      fs.copyFileSync(srcPath, destRuntimePath);
      fs.copyFileSync(srcPath, destRootPath);
    }
  }
  console.log('[MTM Installer] [✓] Immutable runtime payload deployed to team-sdlc-pack/runtime/.');

  // 3. Register Official Registration Files
  fs.copyFileSync(
    path.resolve(runtimeDir, 'team-runtime.json'),
    path.resolve(mtmDir, 'team-runtime.json')
  );
  fs.copyFileSync(
    path.resolve(runtimeDir, 'team-pack-info.json'),
    path.resolve(mtmDir, 'team-pack-info.json')
  );
  console.log('[MTM Installer] [✓] Manifests registered in .mtm/.');

  // 4. Register Codex Agent Profiles and Skills
  copyDirectory(path.resolve(runtimeDir, 'agents'), codexAgentsDir);
  copyDirectory(path.resolve(runtimeDir, 'skills'), agentsSkillsDir);
  console.log('[MTM Installer] [✓] Agent profiles registered in .codex/agents/ and skills in .agents/skills/.');

  // 5. Configure MCP Servers in .codex/config.toml
  const normalizedTargetWorkspace = targetWorkspace.replace(/\\/g, '/');
  const codexTemplate = fs.readFileSync(path.resolve(packRoot, 'config', 'codex.toml'), 'utf8');
  const configuredCodexToml = codexTemplate.replace(/<TeamWorkspace>/g, normalizedTargetWorkspace);

  fs.writeFileSync(path.resolve(codexDir, 'config.toml'), configuredCodexToml, 'utf8');
  fs.writeFileSync(path.resolve(targetPackDir, 'config', 'codex.toml'), configuredCodexToml, 'utf8');
  fs.writeFileSync(path.resolve(runtimeDir, 'config', 'codex.toml'), configuredCodexToml, 'utf8');
  console.log(`[MTM Installer] [✓] MCP server configuration generated with base: ${normalizedTargetWorkspace}`);

  console.log('\n======================================================');
  console.log(' [SUCCESS] Team pack installed & workspace fully configured.');
  console.log('======================================================');
}

install().catch((err) => {
  console.error('[MTM Installer] Installation failed:', err);
  process.exit(1);
});
