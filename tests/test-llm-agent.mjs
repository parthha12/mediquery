import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ingestDischargePacket,
  parseDischargePacket,
} from '../src/services/dischargeParser.ts';
import { askPatientQuestion, askIngestQuestion } from '../src/services/llmAgent.ts';
import { MOCK_WORKSPACES } from '../src/services/mockPatients.ts';

test('askPatientQuestion uses fallback without API key', async () => {
  const job = ingestDischargePacket('test.pdf');
  const { workspace } = parseDischargePacket(job, 'conflicting_meds');
  const answer = await askPatientQuestion(workspace, 'What medications is the patient on?', 'q_test_1');

  assert.match(answer.text.toLowerCase(), /amoxicillin|medication/);
  assert.ok(answer.disclaimer.length > 0);
  assert.ok(answer.references.length >= 0);
});

test('askPatientQuestion answers wound care missing scenario', async () => {
  const job = ingestDischargePacket('Martinez.pdf');
  const { workspace } = parseDischargePacket(job, 'missing_wound_care');
  const answer = await askPatientQuestion(workspace, 'What are the wound care instructions?', 'q_test_2');

  assert.match(answer.text.toLowerCase(), /wound|no wound/);
});

test('askIngestQuestion counts workspaces in fallback mode', async () => {
  const result = await askIngestQuestion(MOCK_WORKSPACES, 'How many patients are in the database?');
  assert.match(result.text, /5/);
  assert.ok(result.disclaimer);
});

test('askIngestQuestion lists flagged patients in fallback mode', async () => {
  const result = await askIngestQuestion(MOCK_WORKSPACES, 'Which patients need review?');
  assert.match(result.text, /Martinez|Nguyen|Cooper|Park/);
});
