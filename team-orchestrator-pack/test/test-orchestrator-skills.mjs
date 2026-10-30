#!/usr/bin/env node
/**
 * MTM Orchestrator Skills & Agent Profiles Test Harness
 * Pure Node.js Standard Library (0 external dependencies)
 * Validates agent TOML directives, skill frontmatter, and HVE Core inheritance compliance.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packRoot = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`[FAIL] ${message}`);
  }
}

console.log('======================================================');
console.log(' MTM Orchestrator Skills & Agent Profiles Test Suite');
console.log('======================================================\n');

// ---------------------------------------------------------------------
// Test Suite 1: Agent Profiles (agents/*.toml)
// ---------------------------------------------------------------------
console.log('--- Test Suite 1: Specialized Agent Profiles ---');

const expectedAgents = [
  { file: 'agents/team-orchestrator.toml', expectedName: 'team_orchestrator', requiredKeywords: ['start_work', 'submit_work', '8 minutes'] },
  { file: 'agents/team-business-analyst.toml', expectedName: 'team_business_analyst', requiredKeywords: ['minimumVerificationScenarios', 'submitTemplate', 'plan.md'] },
  { file: 'agents/team-developer.toml', expectedName: 'team_developer', requiredKeywords: ['matchRoot', 'TDD', 'Minimal Diff'] },
  { file: 'agents/team-tester.toml', expectedName: 'team_tester', requiredKeywords: ['code 0', 'evidence', 'submit.json'] },
  { file: 'agents/team-cyber-security.toml', expectedName: 'team_cyber_security', requiredKeywords: ['OWASP', 'Secret Leakage', 'Incident Response'] }
];

for (const agent of expectedAgents) {
  const filePath = path.resolve(packRoot, agent.file);
  assert(fs.existsSync(filePath), `Agent file exists: ${agent.file}`);

  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.includes(`name = "${agent.expectedName}"`), `${agent.file} declares expected name: ${agent.expectedName}`);
  assert(content.includes('description ='), `${agent.file} declares description`);
  assert(content.includes('developer_instructions ='), `${agent.file} contains developer_instructions`);

  for (const kw of agent.requiredKeywords) {
    const hasKw = content.toLowerCase().includes(kw.toLowerCase());
    assert(hasKw, `${agent.file} includes domain keyword: '${kw}'`);
  }
}

// ---------------------------------------------------------------------
// Test Suite 2: Tournament Skills (skills/*/SKILL.md)
// ---------------------------------------------------------------------
console.log('\n--- Test Suite 2: Autonomous Tournament Skills ---');

const expectedSkills = [
  {
    file: 'skills/game-preparation/SKILL.md',
    expectedName: 'game-preparation',
    requiredSections: ['Pre-Flight Verification Checklist', 'Session Initialization Sequence', 'Mandatory Telemetry Logging']
  },
  {
    file: 'skills/team-orchestrator/SKILL.md',
    expectedName: 'team-orchestrator',
    requiredSections: ['Backlog Wave Prioritization Matrix', 'Code-First', 'Time Budgeting & Fallback Policy', 'Idle Wave Polling Loop']
  },
  {
    file: 'skills/team-recovery/SKILL.md',
    expectedName: 'team-recovery',
    requiredSections: ['Fault Recovery Matrix', 'Idempotent Submission Recovery Protocol', 'Git Workspace Self-Healing Protocol']
  }
];

for (const skill of expectedSkills) {
  const filePath = path.resolve(packRoot, skill.file);
  assert(fs.existsSync(filePath), `Skill file exists: ${skill.file}`);

  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.startsWith('---'), `${skill.file} starts with YAML frontmatter`);
  assert(content.includes(`name: ${skill.expectedName}`), `${skill.file} declares frontmatter name: ${skill.expectedName}`);
  assert(content.includes('description:'), `${skill.file} declares frontmatter description`);

  for (const section of skill.requiredSections) {
    const hasSec = content.includes(section);
    assert(hasSec, `${skill.file} contains section: '${section}'`);
  }

  // Schema sanity checks on skill instructions
  assert(!content.includes('status: `VERIFIED`') && !content.includes('status: "VERIFIED"'), `${skill.file} does not use invalid status enum 'VERIFIED'`);
  assert(!content.includes('stage: `RUNTIME_INITIALIZED`') && !content.includes('stage: "RUNTIME_INITIALIZED"'), `${skill.file} does not use invalid stage enum 'RUNTIME_INITIALIZED'`);
  assert(!content.includes('"PARTIALLY_RESOLVED"'), `${skill.file} does not use invalid status enum 'PARTIALLY_RESOLVED'`);
  assert(!content.includes('"SUBMITTED", revision: null'), `${skill.file} does not use invalid SUBMITTED with null revision`);
}

// ---------------------------------------------------------------------
// Test Suite 3: Manifest Alignment with team-runtime.json
// ---------------------------------------------------------------------
console.log('\n--- Test Suite 3: Manifest & Root Agent Alignment ---');

const runtimePath = path.resolve(packRoot, 'team-runtime.json');
const runtime = JSON.parse(fs.readFileSync(runtimePath, 'utf8'));
assert(runtime.entrypoint?.rootAgentType === 'team_orchestrator', 'team-runtime.json rootAgentType is team_orchestrator');

const rootTomlPath = path.resolve(packRoot, 'agents/team-orchestrator.toml');
const rootToml = fs.readFileSync(rootTomlPath, 'utf8');
assert(rootToml.includes('name = "team_orchestrator"'), 'agents/team-orchestrator.toml matches rootAgentType');

// ---------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------
console.log('\n======================================================');
console.log(` Test Summary: ${passedTests} Passed, ${failedTests} Failed (Total ${totalTests})`);
console.log('======================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
