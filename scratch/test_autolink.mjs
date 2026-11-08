import fs from 'node:fs';
import path from 'node:path';
import { RuntimeSession } from 'file:///D:/mtm/CPL_2/team-sdlc-pack/src/runtime-session.mjs';

const session = new RuntimeSession({
  matchId: 'Y1KH6CB9',
  gameMasterUrl: 'https://masterthemachine.tech'
});

session.checkoutRoot = 'D:/mtm/CPL_2/matches/Y1KH6CB9';
session.assignedFolder = 'Y1KH6CB9';

console.log('Resolved matchRoot:', session.getMatchRoot());

const linked = session.autoLinkChallengeFixtures('CR-01', null);
console.log('Linked files for CR-01:');
console.log(linked);

const testFile = 'D:/mtm/CPL_2/matches/Y1KH6CB9/Y1KH6CB9/src/tests/cr01.test.ts';
if (fs.existsSync(testFile)) {
  console.log('Test file exists! Content:');
  console.log(fs.readFileSync(testFile, 'utf8'));
  // Clean up
  fs.unlinkSync(testFile);
  console.log('Cleaned up scratch test file.');
} else {
  console.log('Test file was not created!');
}
