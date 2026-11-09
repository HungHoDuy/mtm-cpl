import { execSync } from 'node:child_process';
import fs from 'node:fs';

const targets = ['d:/mtm/CPL/matches/wt-bug01', 'd:/mtm/CPL/matches/wt-bug04'];
for (const p of targets) {
  const winPath = p.replace(/\//g, '\\');
  try {
    execSync(`cmd.exe /c "rmdir /s /q \\\\?\\${winPath}"`);
    console.log('Removed:', p);
  } catch (e) {
    console.log('Error removing:', e.message);
  }
}
const rem = fs.readdirSync('d:/mtm/CPL/matches').filter(f => f.startsWith('wt-'));
console.log('Remaining:', rem);

