import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectConflicts,
  summarizeReconciliation,
  resolveConflict,
  deriveReconciliation,
} from '../src/services/reconciliation.ts';
import { buildMargaretWorkspace } from '../src/services/margaretCase.ts';

test('Margaret case matches the investor demo counts', () => {
  const ws = buildMargaretWorkspace();
  const recon = ws.reconciliation;
  assert.ok(recon);
  assert.equal(recon.summary.total, 12);
  assert.equal(recon.summary.changes, 3);
  assert.equal(recon.summary.conflicts, 2);
  assert.equal(recon.summary.unresolved, 2);
  assert.ok(recon.conflicts.some((c) => c.medicationNameNormalized === 'lisinopril' && c.kind === 'status'));
  assert.ok(recon.conflicts.some((c) => c.medicationNameNormalized === 'aspirin' && c.kind === 'missing'));
});

test('detectConflicts flags hospital STOP vs SNF ACTIVE', () => {
  const conflicts = detectConflicts('p1', [
    {
      id: 'e1',
      patientId: 'p1',
      medicationNameRaw: 'Lisinopril',
      medicationNameNormalized: 'lisinopril',
      dose: '10',
      unit: 'mg',
      frequency: 'daily',
      action: 'STOP',
      eventDate: '2026-09-04',
      sourceDocumentId: 'd1',
      sourceKind: 'hospital',
      sourceTitle: 'Hospital discharge',
      sourcePage: 14,
      sourceText: 'Discontinue lisinopril 10 mg daily due to hypotension',
      extractionConfidence: 0.9,
    },
    {
      id: 'e2',
      patientId: 'p1',
      medicationNameRaw: 'Lisinopril 10mg',
      medicationNameNormalized: 'lisinopril',
      dose: '10',
      unit: 'mg',
      frequency: 'daily',
      action: 'CONTINUE',
      eventDate: '2026-09-12',
      sourceDocumentId: 'd2',
      sourceKind: 'snf',
      sourceTitle: 'SNF med list',
      sourcePage: 3,
      sourceText: 'Lisinopril 10 mg PO daily',
      extractionConfidence: 0.88,
    },
  ]);

  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].kind, 'status');
  assert.match(conflicts[0].summary, /STOP/i);
});

test('resolveConflict is immutable and records the human decision', () => {
  const ws = buildMargaretWorkspace();
  const conflict = ws.reconciliation.conflicts.find((c) => c.medicationNameNormalized === 'lisinopril');
  assert.ok(conflict);
  const next = resolveConflict(ws, conflict.id, {
    kind: 'needs_provider',
    note: 'Clarify hypotension stop before first visit',
    resolvedAt: '2026-09-24T12:00:00.000Z',
    resolvedBy: 'Intake RN',
  });

  assert.notEqual(next, ws);
  assert.equal(ws.reconciliation.conflicts.find((c) => c.id === conflict.id)?.resolution, undefined);
  const resolved = next.reconciliation.conflicts.find((c) => c.id === conflict.id);
  assert.equal(resolved?.resolution?.kind, 'needs_provider');
  assert.equal(next.reconciliation.summary.unresolved, 1);
});

test('deriveReconciliation parses a single-packet med list and keeps raw text', () => {
  const derived = deriveReconciliation({
    patient: {
      id: 'patient_whitfield',
      name: 'Eleanor Whitfield',
      mrn: 'SNF-10482',
      dob: '1942-03-14',
      admitDate: '2026-06-10',
    },
    packet: {
      id: 'p',
      patientId: 'patient_whitfield',
      fileName: 'Whitfield.pdf',
      uploadedAt: '2026-06-10T00:00:00.000Z',
      pageCount: 24,
      status: 'complete',
    },
    sections: [
      {
        id: 'sec_med',
        patientId: 'patient_whitfield',
        category: 'medications',
        title: 'Medications',
        content: '• Furosemide 40 mg PO daily\n• Lisinopril 10 mg PO daily',
        status: 'complete',
        sourceDocumentId: 'doc_med',
        pageRef: 'pp. 5–7',
      },
    ],
    sourceDocuments: [
      {
        id: 'doc_med',
        patientId: 'patient_whitfield',
        packetId: 'p',
        title: 'Medication Reconciliation',
        pageStart: 5,
        pageEnd: 7,
        rawText: 'Active medication list at discharge',
      },
    ],
    staffNotes: [],
    questions: [],
    answers: [],
  });

  assert.ok(derived.events.length >= 2);
  assert.ok(derived.events.every((e) => e.medicationNameRaw.length > 0));
  assert.ok(derived.medications.some((m) => m.name.toLowerCase().includes('furosemide')));
});
