import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ingestDischargePacket,
  parseDischargePacket,
  detectTemplate,
} from '../src/services/dischargeParser.ts';
import { resetToMockData, ingestAndParse, listWorkspaces } from '../src/services/patientStore.ts';

beforeEach(() => {
  resetToMockData();
});

test('detectTemplate recognizes all 5 demo filenames', () => {
  assert.equal(detectTemplate('Martinez_Discharge.pdf'), 'missing_wound_care');
  assert.equal(detectTemplate('nguyen_packet.pdf'), 'conflicting_meds');
  assert.equal(detectTemplate('Cooper_James.pdf'), 'missing_therapy');
  assert.equal(detectTemplate('Park_insurance_auth.pdf'), 'incomplete_insurance');
  assert.equal(detectTemplate('whitfield.pdf'), 'complete');
});

test('missing_therapy template produces missing therapy section', () => {
  const job = ingestDischargePacket('Cooper.pdf');
  const { workspace } = parseDischargePacket(job, 'missing_therapy');
  assert.equal(workspace.patient.name, 'James Cooper');
  const therapy = workspace.sections.find((s) => s.category === 'therapy');
  assert.equal(therapy?.status, 'missing');
  assert.ok(therapy?.flags?.length);
});

test('incomplete_insurance template flags insurance section', () => {
  const job = ingestDischargePacket('Park.pdf');
  const { workspace } = parseDischargePacket(job, 'incomplete_insurance');
  assert.equal(workspace.patient.name, 'Linda Park');
  const insurance = workspace.sections.find((s) => s.category === 'insurance');
  assert.equal(insurance?.status, 'needs_review');
  assert.ok(insurance?.flags?.some((f) => f.includes('authorization')));
});

test('full ingest pipeline via patientStore creates navigable workspace', () => {
  const ws = ingestAndParse('Park_Linda_Discharge_2026-06-16.pdf', 'incomplete_insurance');
  assert.ok(ws.patient.id.startsWith('patient_'));
  assert.ok(listWorkspaces().some((w) => w.patient.id === ws.patient.id));
  assert.equal(ws.sections.filter((s) => s.category === 'diagnoses').length, 1);
});
