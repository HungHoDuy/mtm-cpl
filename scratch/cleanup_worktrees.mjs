import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const matchesDir = 'd:/mtm/CPL/matches';

// 1. Prune git worktrees in RME543WG
try {
  const rmeDir = path.join(matchesDir, 'RME543WG');
  if (fs.existsSync(rmeDir)) {
    console.log('Pruning git worktrees from RME543WG...');
    execSync(`git -C "${rmeDir}" worktree prune`, { stdio: 'inherit' });
  }
} catch (e) {
  console.log('Worktree prune error:', e.message);
}

// 2. Remove wt-* folders using cmd /c rmdir /s /q
const entries = fs.readdirSync(matchesDir);
for (const entry of entries) {
  if (entry.startsWith('wt-')) {
    const fullPath = path.join(matchesDir, entry);
    console.log(`Deleting ${entry}...`);
    try {
      execSync(`cmd.exe /c "rmdir /s /q \\\\?\\${fullPath.replace(/\//g, '\\\\')}"`, { stdio: 'ignore' });
      console.log(`Deleted ${entry}`);
    } catch (err) {
      console.log(`Error deleting ${entry}:`, err.message);
    }
  }
}

// Check remaining
const remaining = fs.readdirSync(matchesDir).filter(f => f.startsWith('wt-'));
console.log('Remaining wt-* directories:', remaining);

