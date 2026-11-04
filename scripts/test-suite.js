const assert = require('node:assert');

const BASE_URL = 'http://localhost:3000';
const WEBHOOK_SECRET = 'gforms_sec_7f9a8d4c2b1e0f3a5e8c';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING COMPREHENSIVE FORMBUILDER TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      process.stdout.write(`[TEST ${total}] ${name}... `);
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err) {
      console.log('❌ FAILED');
      console.error('   ', err.message);
    }
  }

  // 1. Backend forms endpoint
  await test('GET /api/forms returns existing forms list', async () => {
    const res = await fetch(`${BASE_URL}/api/forms`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.forms));
    assert.ok(data.forms.length >= 3);
  });

  // 2. Stats endpoint
  await test('GET /api/form-responses/stats returns aggregate metrics', async () => {
    const res = await fetch(`${BASE_URL}/api/form-responses/stats`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.stats.totalForms >= 3);
    assert.ok(data.stats.totalSubmissions >= 1);
    assert.ok(Array.isArray(data.stats.timeline));
  });

  // 3. Webhook Authentication - Missing Secret
  await test('POST /api/webhooks/google-forms rejects missing secret (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/webhooks/google-forms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formId: 'test', externalSubmissionId: '123', answers: [] })
    });
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  // 4. Webhook Authentication - Invalid Secret
  await test('POST /api/webhooks/google-forms rejects invalid secret (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/webhooks/google-forms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': 'invalid_secret_wrong_token'
      },
      body: JSON.stringify({ formId: 'test', externalSubmissionId: '123', answers: [] })
    });
    assert.strictEqual(res.status, 401);
  });

  // 5. Webhook Validation - Invalid Payload
  await test('POST /api/webhooks/google-forms rejects invalid payload missing externalSubmissionId (422)', async () => {
    const res = await fetch(`${BASE_URL}/api/webhooks/google-forms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': WEBHOOK_SECRET
      },
      body: JSON.stringify({ formId: 'class-of-1990-electoral', answers: [] })
    });
    assert.strictEqual(res.status, 422);
  });

  // 6. Successful Form Submission
  const testExtId = `live_sub_${Date.now()}`;
  let createdSubmissionId = null;

  await test('POST /api/webhooks/google-forms accepts valid submission (201)', async () => {
    const payload = {
      secret: WEBHOOK_SECRET,
      formId: 'class-of-1990-electoral',
      formName: 'CLASS OF 1990 - ELECTORAL COMMITTEE APPLICATION FORM',
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1v5DW23IHEmCI553iCmcjqVJGDHShNGHs1qitFt6uDnA',
      externalSubmissionId: testExtId,
      submittedAt: new Date().toISOString(),
      submitterName: 'Senator Olawale Babatunde',
      submitterEmail: 'o.babatunde@alumni90.org',
      submitterPhone: '+234 803 123 4567',
      answers: [
        { question: 'Full Name', answer: 'Senator Olawale Babatunde', type: 'text' },
        { question: 'Date of Birth', answer: '1971-11-25', type: 'date' },
        { question: 'Email Address', answer: 'o.babatunde@alumni90.org', type: 'text' },
        { question: 'Phone Number', answer: '+234 803 123 4567', type: 'text' },
        { question: 'Class/Year Set', answer: 'Class of 1990', type: 'text' },
        { question: 'Position Contested For', answer: 'General Secretary', type: 'dropdown' },
        { question: 'Why are you interested in contesting for this position?', answer: 'To digitize all records, automate committee communications, and maintain prompt correspondence.', type: 'paragraph' },
        { question: 'Write your statement here', answer: 'Transparency, modern communication channels, and integrity will be the cornerstone of my secretariat.', type: 'paragraph' },
        { question: 'Reference Name', answer: 'Prof. K. Alabi', type: 'text' },
        { question: 'Reference Date', answer: '2026-09-08', type: 'date' },
        { question: "Contestant's Name", answer: 'Senator Olawale Babatunde', type: 'text' },
        { question: 'Declaration Confirmation', answer: ['I confirm that I have read, understood, and agree to the declaration above.'], type: 'checkboxes' },
        { question: 'Declaration Date', answer: '2026-09-09', type: 'date' }
      ]
    };

    const res = await fetch(`${BASE_URL}/api/webhooks/google-forms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': WEBHOOK_SECRET
      },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.submission.id);
    createdSubmissionId = data.submission.id;
  });

  // 7. Duplicate Submission Handling
  await test('POST /api/webhooks/google-forms safely handles duplicate submission (200 duplicate)', async () => {
    const duplicatePayload = {
      secret: WEBHOOK_SECRET,
      formId: 'class-of-1990-electoral',
      externalSubmissionId: testExtId,
      submittedAt: new Date().toISOString(),
      answers: [{ question: 'Full Name', answer: 'Senator Olawale Babatunde' }]
    };

    const res = await fetch(`${BASE_URL}/api/webhooks/google-forms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': WEBHOOK_SECRET
      },
      body: JSON.stringify(duplicatePayload)
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.duplicate, true);
  });

  // 8. Retrieve Submission by ID
  await test('GET /api/form-responses/:id returns full submission with parsed answers', async () => {
    assert.ok(createdSubmissionId, 'Requires createdSubmissionId');
    const res = await fetch(`${BASE_URL}/api/form-responses/${createdSubmissionId}`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.submission.submitter_name, 'Senator Olawale Babatunde');
    assert.ok(Array.isArray(data.submission.parsedAnswers));
    assert.strictEqual(data.submission.parsedAnswers.length, 13);
  });

  // 9. Update Submission Status & Admin Notes
  await test('PATCH /api/form-responses/:id updates status to reviewed with notes', async () => {
    const res = await fetch(`${BASE_URL}/api/form-responses/${createdSubmissionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'reviewed',
        notes: 'Credentials and references verified by electoral committee chair.'
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.submission.status, 'reviewed');
    assert.strictEqual(data.submission.notes, 'Credentials and references verified by electoral committee chair.');
  });

  // 10. Search and Filtering
  await test('GET /api/form-responses?search=Babatunde finds submitted candidate', async () => {
    const res = await fetch(`${BASE_URL}/api/form-responses?search=Babatunde`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.items.some(i => i.submitter_name.includes('Babatunde')));
  });

  // 11. Pagination
  await test('GET /api/form-responses?limit=1 enforces pagination', async () => {
    const res = await fetch(`${BASE_URL}/api/form-responses?limit=1&page=1`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.items.length, 1);
    assert.ok(data.totalPages >= 2);
  });

  // 12. CSV Export
  await test('GET /api/form-responses/export?format=csv returns text/csv', async () => {
    const res = await fetch(`${BASE_URL}/api/form-responses/export?format=csv`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('text/csv'));
    const text = await res.text();
    assert.ok(text.includes('Submission ID'));
    assert.ok(text.includes('Babatunde'));
  });

  // 13. Excel (.xlsx) Export
  await test('GET /api/form-responses/export?format=xlsx returns valid spreadsheet binary', async () => {
    const res = await fetch(`${BASE_URL}/api/form-responses/export?format=xlsx`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('spreadsheetml'));
    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 1000);
  });

  // 14. Webhook Logs
  await test('GET /api/integration-logs records delivery events and statuses', async () => {
    const res = await fetch(`${BASE_URL}/api/integration-logs?limit=10`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.items.length >= 3);
    assert.ok(data.items.some(log => log.status === 'success'));
    assert.ok(data.items.some(log => log.status === 'duplicate'));
    assert.ok(data.items.some(log => log.status === 'unauthorized'));
  });

  // 15. Frontend Dashboard HTML
  await test('GET / renders dashboard HTML with FormBuilder branding', async () => {
    const res = await fetch(`${BASE_URL}/`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('FormBuilder'));
    assert.ok(html.includes('Dashboard'));
  });

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed}/${total} TESTS PASSED!`);
  console.log('====================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
