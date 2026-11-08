import fs from 'fs';
import path from 'path';

const answersDir = 'D:/mtm/CPL/matches/LC2TR4Y2/LC2TR4Y2/answers';
const items = fs.readdirSync(answersDir).filter(f => fs.statSync(path.join(answersDir, f)).isDirectory());

console.log('Submissions found:');
for (const item of items) {
  const receiptPath = path.join(answersDir, item, 'evidence', 'submission-receipt.json');
  const submitPath = path.join(answersDir, item, 'submit.json');
  let receipt = null;
  let submit = null;
  if (fs.existsSync(receiptPath)) {
    receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  }
  if (fs.existsSync(submitPath)) {
    submit = JSON.parse(fs.readFileSync(submitPath, 'utf8'));
  }
  console.log(`\n=== ${item} ===`);
  if (receipt) {
    console.log('Receipt:', JSON.stringify(receipt));
  } else {
    console.log('No receipt');
  }
  if (submit) {
    console.log('Submit keys:', Object.keys(submit));
    if (submit.receipt) console.log('Submit.receipt:', submit.receipt);
  }
}

