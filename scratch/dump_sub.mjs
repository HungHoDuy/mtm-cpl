import fs from 'fs';

const data = JSON.parse(fs.readFileSync('d:/mtm/scratch/sub_38IX07C9.json', 'utf8'));
const cpl = data['CPL'];
for (const [k, v] of Object.entries(cpl)) {
  console.log(`\n=== KEY: ${k} ===`);
  console.log(JSON.stringify(v.sub, null, 2).slice(0, 1000));
}

