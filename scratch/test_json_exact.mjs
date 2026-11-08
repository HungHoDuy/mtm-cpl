import fs from 'node:fs';

const html = fs.readFileSync('D:\\mtm\\scratch\\match_Y1KH6CB9.html', 'utf8');

// In Next.js stream payload, items are JSON objects
// Let's test extracting the exact object for each key
const keys = ['BUG-01', 'BUG-02', 'BUG-03', 'CR-01', 'PI-01', 'CR-02', 'BUG-04'];

for (const k of keys) {
  // Matches "key":"<k>"... up to the next "key":" or end of item
  // More specifically, match within the JSON object containing "key":"<k>"
  const regex = new RegExp(`\\\\?"key\\\\?":\\\\?"${k}\\\\?"(?:(?!\\\\?"key\\\\?":)[\\s\\S])*?\\\\?"deadlineMinutes\\\\?":(\\d+|null)`, 'i');
  const m = html.match(regex);
  const dl = (m && m[1] !== 'null') ? parseInt(m[1], 10) : null;
  console.log(`${k} JSON deadline:`, dl);
}

