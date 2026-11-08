import fs from 'fs';

const s = JSON.parse(fs.readFileSync('d:/mtm/scratch/spectator_ZV98D2FF_state.json', 'utf8'));
const cplAct = (s.teamActivity || []).filter(a => a.teamId === 'b8361640-5140-49a3-97b9-7522c4b698bb');

console.log('--- CPL Spectator Activities (' + cplAct.length + ') ---');
cplAct.forEach(a => {
  const ts = a.timestamp || a.createdAt || a.time || '';
  const key = a.backlogItemKey || a.type || '';
  const act = a.status || a.action || '';
  const sum = a.title || a.summary || '';
  console.log(`[${ts}] ${key} : ${act} | ${sum}`);
});

console.log('\n--- Spectator Events (' + (s.events || []).length + ') ---');
(s.events || []).filter(e => e.teamId === 'b8361640-5140-49a3-97b9-7522c4b698bb').forEach(e => {
  console.log(`[${e.timestamp}] ${e.type} | ${e.backlogItemKey || ''} | ${e.summary || ''}`);
});

