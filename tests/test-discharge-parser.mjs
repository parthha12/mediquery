import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ingestDischargePacket,
  parseDischargePacket,
  classifySections,
  createSourceReferences,
  detectTemplate,
} from '../src/services/dischargeParser.ts';

test('ingestDischargePacket creates queued job', () => {
  const job = ingestDischargePacket('test.pdf');
  assert.equal(job.status, 'queued');
  assert.equal(job.fileName, 'test.pdf');
  assert.ok(job.id.startsWith('job_'));
});

test('detectTemplate identifies mock scenarios from filename', () => {
  assert.equal(detectTemplate('Martinez_Discharge.pdf'), 'missing_wound_care');
  assert.equal(detectTemplate('nguyen_packet.pdf'), 'conflicting_meds');
  assert.equal(detectTemplate('Cooper_James.pdf'), 'missing_therapy');
  assert.equal(detectTemplate('Park_insurance.pdf'), 'incomplete_insurance');
  assert.equal(detectTemplate('whitfield.pdf'), 'complete');
});

test('parseDischargePacket builds complete workspace', () => {
  const job = ingestDischargePacket('Whitfield_Eleanor_Discharge.pdf');
  const { job: completed, workspace } = parseDischargePacket(job, 'complete');

  assert.equal(completed.status, 'complete');
  assert.ok(completed.patientId);
  assert.equal(workspace.patient.name, 'Eleanor Whitfield');
  assert.ok(workspace.sections.length >= 10);
  assert.ok(workspace.sourceDocuments.length >= 5);

  const wound = workspace.sections.find((s) => s.category === 'wound_care');
  assert.equal(wound?.status, 'complete');
});

test('missing wound care template flags wound section', () => {
  const job = ingestDischargePacket('Martinez.pdf');
  const { workspace } = parseDischargePacket(job, 'missing_wound_care');

  const wound = workspace.sections.find((s) => s.category === 'wound_care');
  assert.equal(wound?.status, 'missing');
  assert.ok(wound?.flags?.length);
});

test('conflicting meds template flags human review', () => {
  const job = ingestDischargePacket('Nguyen.pdf');
  const { workspace } = parseDischargePacket(job, 'conflicting_meds');

  const meds = workspace.sections.find((s) => s.category === 'medications');
  assert.equal(meds?.status, 'human_review_required');
  assert.ok(meds?.flags?.some((f) => f.includes('Penicillin')));
});

test('createSourceReferences links sections to documents', () => {
  const job = ingestDischargePacket('test.pdf');
  const { workspace } = parseDischargePacket(job, 'complete');
  const refs = createSourceReferences(workspace.sections, workspace.sourceDocuments);
  assert.ok(refs.length > 0);
  assert.ok(refs.every((r) => r.label && r.page > 0));
});
