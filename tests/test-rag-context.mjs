import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ingestDischargePacket,
  parseDischargePacket,
} from '../src/services/dischargeParser.ts';
import {
  buildPatientRagContext,
  buildIngestRagContext,
  resolveReferences,
} from '../src/services/ragContext.ts';

function buildWorkspace(template) {
  const job = ingestDischargePacket(`${template}.pdf`);
  return parseDischargePacket(job, template).workspace;
}

test('buildPatientRagContext includes section ids for citations', () => {
  const ws = buildWorkspace('complete');
  const ctx = buildPatientRagContext(ws);
  assert.match(ctx, /section_id=/);
  assert.match(ctx, /Eleanor Whitfield/);
});

test('buildIngestRagContext aggregates multiple workspaces', () => {
  const workspaces = ['complete', 'conflicting_meds', 'missing_therapy'].map(buildWorkspace);
  const ctx = buildIngestRagContext(workspaces);
  assert.match(ctx, /INGEST DATABASE/);
  assert.match(ctx, /3 patient workspace/);
});

test('resolveReferences returns source links for valid section ids', () => {
  const ws = buildWorkspace('complete');
  const med = ws.sections.find((s) => s.category === 'medications');
  const refs = resolveReferences(ws, [med.id]);
  assert.equal(refs.length, 1);
  assert.match(refs[0].label, /Source Linked/);
});
