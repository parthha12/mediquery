import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  listWorkspaces,
  getWorkspace,
  ingestAndParse,
  addStaffNote,
  askQuestion,
  searchWorkspaces,
  resetToMockData,
  addWorkspace,
} from '../src/services/patientStore.ts';

beforeEach(() => {
  resetToMockData();
});

test('listWorkspaces returns 5 prepopulated patients', () => {
  const all = listWorkspaces();
  assert.equal(all.length, 5);
  assert.ok(all.some((w) => w.patient.name === 'James Cooper'));
  assert.ok(all.some((w) => w.patient.name === 'Linda Park'));
});

test('getWorkspace finds patient by id', () => {
  const ws = getWorkspace('patient_nguyen');
  assert.ok(ws);
  assert.equal(ws.patient.name, 'Dorothy Nguyen');
});

test('ingestAndParse adds a new workspace from intake', () => {
  const before = listWorkspaces().length;
  const workspace = ingestAndParse('Demo_New_Patient.pdf', 'incomplete_insurance');
  const after = listWorkspaces().length;

  assert.equal(after, before + 1);
  assert.equal(workspace.patient.name, 'Linda Park');
  const insurance = workspace.sections.find((s) => s.category === 'insurance');
  assert.equal(insurance?.status, 'needs_review');
});

test('ingestAndParse updates existing patient when same id ingested again', () => {
  const first = ingestAndParse('Test_Reingest.pdf', 'complete');
  const countAfterFirst = listWorkspaces().length;
  const updated = {
    ...first,
    staffNotes: [
      ...first.staffNotes,
      {
        id: 'note_test',
        patientId: first.patient.id,
        text: 'Re-ingested',
        author: 'Test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  };
  addWorkspace(updated);
  assert.equal(listWorkspaces().length, countAfterFirst);
  assert.equal(getWorkspace(first.patient.id)?.staffNotes.length, 1);
});

test('addStaffNote appends note to workspace', () => {
  const note = addStaffNote('patient_whitfield', 'Demo note for testing', undefined, 'Demo User');
  assert.ok(note);
  const ws = getWorkspace('patient_whitfield');
  assert.ok(ws?.staffNotes.some((n) => n.text === 'Demo note for testing'));
});

test('askQuestion records Q&A on workspace', () => {
  const result = askQuestion('patient_martinez', 'What are the wound care instructions?');
  assert.ok(result);
  assert.match(result.answer.text.toLowerCase(), /wound/);
  const ws = getWorkspace('patient_martinez');
  assert.equal(ws?.questions.length, 2);
});

test('searchWorkspaces finds by name, MRN, and content', () => {
  assert.equal(searchWorkspaces('Whitfield').length, 1);
  assert.equal(searchWorkspaces('SNF-11317').length, 1);
  assert.ok(searchWorkspaces('amoxicillin').some((w) => w.patient.name === 'Dorothy Nguyen'));
  assert.equal(searchWorkspaces('nonexistent_xyz').length, 0);
});
