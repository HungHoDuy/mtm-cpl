import fs from 'fs';

async function extractCells(html) {
  let fullText = '';
  for (const match of html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)) {
    try {
      fullText += JSON.parse(`"${match[1]}"`);
    } catch {
      fullText += match[1];
    }
  }
  const idx = fullText.indexOf('"initialState":');
  if (idx === -1) return null;
  let depth = 0;
  let start = fullText.indexOf('{', idx);
  let end = -1;
  for (let i = start; i < fullText.length; i++) {
    if (fullText[i] === '{') depth++;
    else if (fullText[i] === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) return null;
  const parsed = JSON.parse(fullText.slice(start, end + 1));
  return parsed;
}

const matchFiles = fs.readdirSync('d:/mtm/scratch').filter(f => f.startsWith('spectator_') && f.endsWith('.html'));
for (const mf of matchFiles) {
  const matchId = mf.replace('spectator_', '').replace('.html', '');
  const html = fs.readFileSync('d:/mtm/scratch/' + mf, 'utf8');
  try {
    const data = await extractCells(html);
    if (!data) continue;
    const cpl = data.teams?.find(t => t.teamCode === 'CPL');
    const fra = data.teams?.find(t => t.teamCode === 'FRA');
    console.log(`=== Match ${matchId} ===`);
    if (cpl) {
      const cr01 = cpl.cells?.find(c => c.backlogItemKey === 'CR-01');
      console.log('  CPL CR-01:', cr01 ? `${cr01.points}/${cr01.graderPoints}` : 'none');
    }
    if (fra) {
      const cr01 = fra.cells?.find(c => c.backlogItemKey === 'CR-01');
      console.log('  FRA CR-01:', cr01 ? `${cr01.points}/${cr01.graderPoints}` : 'none');
    }
  } catch (err) {
    console.log(`  Error on ${matchId}:`, err.message);
  }
}

