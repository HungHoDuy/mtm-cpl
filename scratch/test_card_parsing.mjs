import fs from 'node:fs';

const html = fs.readFileSync('D:\\mtm\\scratch\\match_Y1KH6CB9.html', 'utf8');

// Let's see the entire block for BUG-03 and BUG-02
const bug03Idx = html.indexOf('text-zinc-300">BUG-03</span>');
console.log('=== BUG-03 Card context (800 chars) ===');
console.log(html.slice(bug03Idx - 50, bug03Idx + 750));

const bug02Idx = html.indexOf('text-zinc-300">BUG-02</span>');
console.log('\n=== BUG-02 Card context (800 chars) ===');
console.log(html.slice(bug02Idx - 50, bug02Idx + 750));

