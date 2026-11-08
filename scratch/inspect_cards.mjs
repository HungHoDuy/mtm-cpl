import fs from 'node:fs';

const html = fs.readFileSync('D:\\mtm\\scratch\\match_Y1KH6CB9.html', 'utf8');

const regex = /<span class="font-mono text-zinc-300">\s*(TASK-[0-9]+|CR-[0-9]+|BUG-[0-9]+|PI-[0-9]+)\s*<\/span>([\s\S]*?)<span class="rounded border px-2 py-0.5 [^"]*">\s*(OPEN|VISIBLE|CLOSED|IN_PROGRESS|COMPLETED)\s*<\/span>/gi;

let match;
while ((match = regex.exec(html)) !== null) {
  const key = match[1];
  const cardMiddle = match[2];
  const status = match[3];
  console.log(`\n================== ${key} (${status}) ==================`);
  console.log('--- cardMiddle: ---');
  console.log(cardMiddle.trim());
}

// Also search for any occurrence of BUG-03 anywhere in the HTML
console.log('\n================== All mentions of BUG-03: ==================');
const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.includes('BUG-03')) {
    console.log(`Line ${i}:`, l.slice(0, 300));
    // Print 10 lines around it
    for (let j = Math.max(0, i - 5); j <= Math.min(lines.length - 1, i + 10); j++) {
      console.log(` [L${j}]`, lines[j]);
    }
  }
});

