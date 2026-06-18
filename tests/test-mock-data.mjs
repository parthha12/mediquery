import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOCK_WORKSPACES, MOCK_PACKET_OPTIONS } from '../src/services/mockPatients.ts';

test('MOCK_WORKSPACES has 5 patients with expected scenarios', () => {
  assert.equal(MOCK_WORKSPACES.length, 5);
  const names = MOCK_WORKSPACES.map((w) => w.patient.name);
  assert.deepEqual(names, [
    'Eleanor Whitfield',
    'Robert Martinez',
    'Dorothy Nguyen',
    'James Cooper',
    'Linda Park',
  ]);
});

test('each workspace has required clinical sections', () => {
  for (const ws of MOCK_WORKSPACES) {
    assert.ok(ws.sections.length >= 10, `${ws.patient.name} should have 10+ sections`);
    assert.ok(ws.sourceDocuments.length >= 5, `${ws.patient.name} should have source docs`);
    assert.equal(ws.packet.status, 'complete');
  }
});

test('scenario-specific flags are seeded correctly', () => {
  const martinez = MOCK_WORKSPACES.find((w) => w.patient.id === 'patient_martinez');
  const nguyen = MOCK_WORKSPACES.find((w) => w.patient.id === 'patient_nguyen');
  const cooper = MOCK_WORKSPACES.find((w) => w.patient.id === 'patient_cooper');
  const park = MOCK_WORKSPACES.find((w) => w.patient.id === 'patient_park');

  assert.equal(martinez?.sections.find((s) => s.category === 'wound_care')?.status, 'missing');
  assert.equal(nguyen?.sections.find((s) => s.category === 'medications')?.status, 'human_review_required');
  assert.equal(cooper?.sections.find((s) => s.category === 'therapy')?.status, 'missing');
  assert.equal(park?.sections.find((s) => s.category === 'insurance')?.status, 'needs_review');
});

test('seeded chat history exists on demo patients', () => {
  const whitfield = MOCK_WORKSPACES.find((w) => w.patient.id === 'patient_whitfield');
  assert.equal(whitfield?.questions.length, 1);
  assert.equal(whitfield?.answers.length, 1);
  assert.ok(whitfield?.answers[0].references.length > 0);
});

test('MOCK_PACKET_OPTIONS covers all 5 ingest templates', () => {
  assert.equal(MOCK_PACKET_OPTIONS.length, 5);
  const templates = MOCK_PACKET_OPTIONS.map((o) => o.template);
  assert.ok(templates.includes('missing_therapy'));
  assert.ok(templates.includes('incomplete_insurance'));
});
