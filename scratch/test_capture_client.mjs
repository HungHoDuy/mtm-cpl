import fs from 'fs';
import { verifyEvidenceReport } from 'file:///D:/mtm/CPL/team-sdlc-pack/scripts/capture-client.mjs';

// Test 1: verifyEvidenceReport on good report
const sampleReportPath = 'd:/mtm/scratch/sample_report.txt';
fs.writeFileSync(sampleReportPath, `
BUG-02 currency report
vnd_company: Mekong Logistics CPL
vnd_invoice_status: PARTIAL
vnd_invoice_currency: VND
vnd_invoice_total_minor: 49360
vnd_invoice_paid_minor: 15000
usd_company: Cedar Analytics CPL
usd_invoice_status: SENT
usd_invoice_currency: USD
usd_invoice_total_minor: 12375
usd_invoice_paid_minor: 0
`);

try {
  verifyEvidenceReport(sampleReportPath, {
    vnd_invoice_status: 'PARTIAL',
    vnd_invoice_paid_minor: '15000',
    vnd_invoice_currency: /vnd/i
  });
  console.log('[PASS] Test 1: Valid report passed verification.');
} catch (e) {
  console.error('[FAIL] Test 1:', e.message);
}

// Test 2: verifyEvidenceReport on bad report (like what happened in the match)
const badReportPath = 'd:/mtm/scratch/bad_report.txt';
fs.writeFileSync(badReportPath, `
BUG-02 currency report
vnd_company: Mekong Logistics CPL
vnd_invoice_status: SENT
vnd_invoice_paid_minor: 0
`);

try {
  verifyEvidenceReport(badReportPath, {
    vnd_invoice_status: 'PARTIAL',
    vnd_invoice_paid_minor: '15000'
  });
  console.error('[FAIL] Test 2: Should have thrown an error but passed!');
} catch (e) {
  console.log('[PASS] Test 2: Correctly caught bad evidence before submission:', e.message);
}

