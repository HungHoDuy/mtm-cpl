import fs from 'node:fs';

const html = fs.readFileSync('D:\\mtm\\scratch\\match_Y1KH6CB9.html', 'utf8');

// Search for the JSON array of backlogs in html
const match = html.match(/\[\{"id":"[^"]+","key":"[A-Z0-9-]+".*?\}\]/);
if (match) {
  console.log('Found backlogs JSON in page!');
  try {
    const items = JSON.parse(match[0]);
    console.log(`Parsed ${items.length} items from embedded JSON:`);
    items.forEach(it => {
      console.log(`- ${it.key}: points=${it.points}, deadlineMinutes=${it.deadlineMinutes}, status=${it.status}`);
    });
  } catch (e) {
    console.log('JSON parse failed:', e.message);
  }
} else {
  // Let's search around "deadlineMinutes"
  const idx = html.indexOf('"deadlineMinutes"');
  console.log('Context around "deadlineMinutes":');
  console.log(html.slice(idx - 100, idx + 300));
}

