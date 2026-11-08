import { execSync } from 'child_process';

const out = execSync('git -C D:/mtm/CPL/matches/ZV98D2FF/ZV98D2FF log --pretty=format:"%h | %ad | %s" --date=iso-strict', { encoding: 'utf8' });
console.log(out);

