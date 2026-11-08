import fs from 'fs';

for (const match of ['CMSC8VA4', 'Y1KH6CB9']) {
  const file = `d:/mtm/scratch/spectator_${match}.html`;
  if (fs.existsSync(file)) {
    const html = fs.readFileSync(file, 'utf8');
    let fullText = '';
    for (const match of html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)) {
      try {
        fullText += JSON.parse(`"${match[1]}"`);
      } catch (e) {
        fullText += match[1];
      }
    }
    const idx = fullText.indexOf('"initialState":');
    if (idx !== -1) {
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
      const parsed = JSON.parse(fullText.slice(start, end + 1));
      const cpl = parsed.teams.find(t => t.teamCode === 'CPL');
      if (cpl) {
        const cr01 = cpl.cells.find(c => c.backlogItemKey === 'CR-01');
        console.log(`Match ${match}: CPL CR-01 -> points: ${cr01?.points}, graderPoints: ${cr01?.graderPoints}`);
      }
    }
  }
}

