import fs from 'node:fs';
import path from 'node:path';
import { RuntimeSession } from '../CPL/team-sdlc-pack/src/runtime-session.mjs';

async function test() {
  console.log('--- TEST 1: MVS Parsing & Auto-Enrichment on match CMSC8VA4 ---');
  const session = new RuntimeSession();
  const matchRoot = 'D:\\mtm\\CPL\\matches\\CMSC8VA4\\CMSC8VA4';
  session.checkoutRoot = 'D:\\mtm\\CPL\\matches\\CMSC8VA4';
  session.assignedFolder = 'CMSC8VA4';

  const bug01Mvs = session.parseMvsRequirements(matchRoot, 'BUG-01');
  console.log('BUG-01 MVS Requirements:', bug01Mvs);
  if (!bug01Mvs['BUG-01-TC-01']?.includes('layout-report-dev.json')) {
    throw new Error('BUG-01 TC-01 failed to detect layout-report-dev.json');
  }

  const bug02Mvs = session.parseMvsRequirements(matchRoot, 'BUG-02');
  console.log('BUG-02 MVS Requirements:', bug02Mvs);
  if (!bug02Mvs['BUG-02-TC-01']?.includes('currency-report.txt')) {
    throw new Error('BUG-02 TC-01 failed to detect currency-report.txt');
  }

  const cr01Mvs = session.parseMvsRequirements(matchRoot, 'CR-01');
  console.log('CR-01 MVS Requirements:', cr01Mvs);
  if (!cr01Mvs['CR-01-TC-01']?.includes('tc-01-all-invoices.csv')) {
    throw new Error('CR-01 TC-01 failed to detect tc-01-all-invoices.csv');
  }

  console.log('\n--- TEST 2: packAndSanitizeSubmission on BUG-01 ---');
  const res01 = session.packAndSanitizeSubmission('BUG-01', null, 'DONE');
  console.log('BUG-01 pack result:', {
    status: res01.status,
    evidenceFilesCount: res01.evidenceFilesCount,
    testCasesCount: res01.testCasesCount,
    tc1Evidence: res01.doc.testResults[0].evidence,
    tc2Evidence: res01.doc.testResults[1].evidence
  });

  if (!res01.doc.testResults[0].evidence.includes('evidence/layout-report-dev.json')) {
    throw new Error('BUG-01 TC-01 evidence missing layout-report-dev.json!');
  }
  if (!res01.doc.testResults[1].evidence.includes('evidence/layout-report-prod.json')) {
    throw new Error('BUG-01 TC-02 evidence missing layout-report-prod.json!');
  }

  console.log('\n--- TEST 3: packAndSanitizeSubmission on BUG-02 ---');
  const res02 = session.packAndSanitizeSubmission('BUG-02', null, 'DONE');
  console.log('BUG-02 pack result:', {
    status: res02.status,
    evidenceFilesCount: res02.evidenceFilesCount,
    testCasesCount: res02.testCasesCount,
    tc1Evidence: res02.doc.testResults[0].evidence,
    tc2Evidence: res02.doc.testResults[1].evidence
  });

  if (!res02.doc.testResults[0].evidence.includes('evidence/currency-report.txt')) {
    throw new Error('BUG-02 TC-01 evidence missing currency-report.txt!');
  }

  console.log('\n--- TEST 4: Hard Blocking Gate on Missing File ---');
  // Temporarily request a non-existent backlog item to verify blocking
  const dummyChallengeMvs = path.join(matchRoot, 'challenge', 'DUMMY-01-minimum-verification-scenarios.md');
  fs.writeFileSync(dummyChallengeMvs, `
## DUMMY-01-TC-01 – test case
Required evidence: non-existent-report.txt
`, 'utf8');

  try {
    session.packAndSanitizeSubmission('DUMMY-01', null, 'DONE');
    throw new Error('Expected packAndSanitizeSubmission to throw fatal error on missing MVS file, but it did not!');
  } catch (err) {
    if (err.message.includes('[PRE-SUBMIT BLOCKED]')) {
      console.log('[PASS] Hard Blocking Gate successfully blocked submission with message:', err.message);
    } else {
      throw err;
    }
  } finally {
    fs.unlinkSync(dummyChallengeMvs);
    const dummyAnswer = path.join(matchRoot, 'answers', 'DUMMY-01');
    if (fs.existsSync(dummyAnswer)) {
      fs.rmSync(dummyAnswer, { recursive: true, force: true });
    }
  }

  console.log('\n=============================================');
  console.log(' ALL 4 HARDENING VERIFICATION TESTS PASSED! ');
  console.log('=============================================');
}

test().catch(err => {
  console.error('[TEST ERROR]:', err);
  process.exit(1);
});

