import fs from 'node:fs';
const html = fs.readFileSync('D:/mtm/scratch/match_Y1KH6CB9.html', 'utf8');

// Try matching "backlog":\[{...}\]
const match = html.match(/\\?"backlog\\?":\s*(\[[\s\S]*?\])(?:,\s*\\?"events\\?"|,\s*"events")/i);
if (match) {
  let jsonStr = match[1];
  // If escaped, unescape
  if (jsonStr.includes('\\"')) {
    jsonStr = jsonStr.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  try {
    const backlog = JSON.parse(jsonStr);
    console.log('Successfully parsed backlog JSON array! Count:', backlog.length);
    backlog.forEach(b => {
      console.log(`- ${b.key}: title="${b.title}", status=${b.status}, points=${b.points}, deadlineMinutes=${b.deadlineMinutes}`);
    });
  } catch (err) {
    console.error('JSON parse error:', err.message);
  }
} else {
  console.log('Backlog array regex match failed');
}
