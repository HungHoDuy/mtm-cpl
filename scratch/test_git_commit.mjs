import { execSync } from 'child_process';
import path from 'path';

const srcDir = 'D:/mtm/CPL/matches/38IX07C9/38IX07C9/src';

const commandArgs = ['commit', '-m', '"fix(accounting): protect invoice history with RESTRICT on company delete"'];
const cmd = `git ${commandArgs.join(' ')}`;
console.log('Command to run:', cmd);

try {
  const out = execSync(cmd, { cwd: srcDir, encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  console.log('Success:', out);
} catch (e) {
  console.log('Error stdout:', e.stdout);
  console.log('Error stderr:', e.stderr);
  console.log('Error message:', e.message);
}

