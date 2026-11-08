import fs from 'fs';
import path from 'path';

const answersDir = 'D:/mtm/CPL/matches/ZV98D2FF/ZV98D2FF/answers';
const items = fs.readdirSync(answersDir).filter(f => fs.statSync(path.join(answersDir, f)).isDirectory());

console.log('--- EVIDENCE FILES PER TASK ---');
items.forEach(item => {
  const evDir = path.join(answersDir, item, 'evidence');
  if (fs.existsSync(evDir)) {
    const files = fs.readdirSync(evDir);
    console.log(`\n${item} (${files.length} evidence files):`);
    files.forEach(f => {
      const stat = fs.statSync(path.join(evDir, f));
      console.log(`  - ${f.padEnd(35)} (${stat.size} bytes)`);
    });
  } else {
    console.log(`\n${item}: NO evidence dir`);
  }
});

