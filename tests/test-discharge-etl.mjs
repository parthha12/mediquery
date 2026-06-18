import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { etlDischargePacket } from '../src/services/dischargeEtl.ts';
import { extractPdfPages } from '../src/services/pdfText.ts';

const SAMPLE_PDF = join(process.cwd(), 'samples/Branson_Harold_Discharge_2026-06-17_MESSY.pdf');

test('etlDischargePacket extracts Branson demographics from messy PDF', async () => {
  const data = new Uint8Array(readFileSync(SAMPLE_PDF));
  const pages = await extractPdfPages(data);
  const workspace = etlDischargePacket('Branson_Harold_Discharge_2026-06-17_MESSY.pdf', pages);

  assert.ok(pages.length >= 10);
  assert.match(workspace.patient.name, /Harold.*Branson/i);
  assert.match(workspace.patient.mrn, /SNF-0048721|SNF-48721/);
  assert.equal(workspace.patient.admitDate, '2026-06-17');
  assert.ok(workspace.sourceDocuments.length >= 5);
});

test('etlDischargePacket flags med/allergy and missing wound orders', async () => {
  const data = new Uint8Array(readFileSync(SAMPLE_PDF));
  const pages = await extractPdfPages(data);
  const workspace = etlDischargePacket('Branson_Harold_Discharge_2026-06-17_MESSY.pdf', pages);

  const meds = workspace.sections.find((s) => s.category === 'medications');
  const allergies = workspace.sections.find((s) => s.category === 'allergies');
  const wound = workspace.sections.find((s) => s.category === 'wound_care');
  const therapy = workspace.sections.find((s) => s.category === 'therapy');
  const insurance = workspace.sections.find((s) => s.category === 'insurance');

  assert.equal(meds?.status, 'human_review_required');
  assert.ok(meds?.flags?.some((f) => /penicillin/i.test(f)));
  assert.ok(allergies?.content.match(/penicillin/i));
  assert.ok(meds?.content.match(/amoxicillin/i));
  assert.equal(wound?.status, 'needs_review');
  assert.equal(therapy?.status, 'missing');
  assert.equal(insurance?.status, 'needs_review');
});

test('etlDischargePacket extracts diagnoses and labs', async () => {
  const data = new Uint8Array(readFileSync(SAMPLE_PDF));
  const pages = await extractPdfPages(data);
  const workspace = etlDischargePacket('Branson_Harold_Discharge_2026-06-17_MESSY.pdf', pages);

  const dx = workspace.sections.find((s) => s.category === 'diagnoses');
  const labs = workspace.sections.find((s) => s.category === 'labs');

  assert.ok(dx?.content.match(/heart failure|I50/i));
  assert.ok(labs?.content.match(/INR|Creat|HbA1c/i));
});
