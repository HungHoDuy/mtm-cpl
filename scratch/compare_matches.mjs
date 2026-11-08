import { execSync } from 'child_process';

const log = execSync('git -C "D:/mtm/CPL/matches/LC2TR4Y2/LC2TR4Y2" log --format="%h|%an|%ad|%s" --date=format:"%H:%M:%S"', { encoding: 'utf8' });

console.log('--- GIT COMMITS FOR TODAY (2026-11-02) ---');
const lines = log.split('\n').filter(l => l.includes('2026-11-02') || l.length > 0);
for (const l of lines.slice(0, 36)) {
  console.log(l);
}

