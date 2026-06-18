#!/usr/bin/env node
/**
 * Smoke-test /api/chat when dev server is running on localhost:3000
 */
const BASE = process.env.APP_URL ?? 'http://localhost:3000';

async function smokeTest() {
  const health = await fetch(`${BASE}/api/chat`);
  if (!health.ok) throw new Error(`GET /api/chat failed: ${health.status}`);
  const healthData = await health.json();
  console.log(`✔ GET /api/chat — llmEnabled: ${healthData.llmEnabled}`);

  const { MOCK_WORKSPACES } = await import('../src/services/mockPatients.ts');
  const workspace = MOCK_WORKSPACES[0];

  const patientRes = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scope: 'patient',
      question: 'What medications is this patient on?',
      workspace,
    }),
  });
  if (!patientRes.ok) throw new Error(`POST patient chat failed: ${patientRes.status}`);
  const patientData = await patientRes.json();
  assertTruthy(patientData.answer?.text, 'patient answer text');
  console.log('✔ POST /api/chat patient scope');

  const ingestRes = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scope: 'ingest',
      question: 'How many patients are in the ingest database?',
      workspaces: MOCK_WORKSPACES,
    }),
  });
  if (!ingestRes.ok) throw new Error(`POST ingest chat failed: ${ingestRes.status}`);
  const ingestData = await ingestRes.json();
  assertTruthy(ingestData.text, 'ingest answer text');
  console.log('✔ POST /api/chat ingest scope');
}

function assertTruthy(value, label) {
  if (!value) throw new Error(`Expected ${label} to be truthy`);
}

smokeTest().catch((err) => {
  console.error('✖ Live smoke test failed:', err.message);
  process.exit(1);
});
