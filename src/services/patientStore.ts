import type { AIAnswer, AIQuestion, PatientWorkspace, StaffNote } from '@/types';
import { MOCK_WORKSPACES } from './mockPatients';
import { ingestDischargePacket, parseDischargePacket } from './dischargeParser';
import type { MockPacketTemplate } from '@/types';

const STORAGE_KEY = 'jot-snf-workspaces';

function loadFromStorage(): PatientWorkspace[] {
  if (typeof window === 'undefined') return [...MOCK_WORKSPACES];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...MOCK_WORKSPACES];
    const parsed = JSON.parse(raw) as PatientWorkspace[];
    return parsed.length ? parsed : [...MOCK_WORKSPACES];
  } catch {
    return [...MOCK_WORKSPACES];
  }
}

function saveToStorage(workspaces: PatientWorkspace[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
}

let workspaces: PatientWorkspace[] = loadFromStorage();

function refresh(): void {
  if (typeof window === 'undefined') return;
  workspaces = loadFromStorage();
}

export function listWorkspaces(): PatientWorkspace[] {
  refresh();
  return [...workspaces];
}

export function getWorkspace(patientId: string): PatientWorkspace | undefined {
  refresh();
  return workspaces.find((w) => w.patient.id === patientId);
}

export function addWorkspace(workspace: PatientWorkspace): PatientWorkspace {
  refresh();
  const existing = workspaces.findIndex((w) => w.patient.id === workspace.patient.id);
  if (existing >= 0) {
    workspaces[existing] = workspace;
  } else {
    workspaces = [workspace, ...workspaces];
  }
  saveToStorage(workspaces);
  return workspace;
}

export function ingestAndParse(
  fileName: string,
  template?: MockPacketTemplate
): PatientWorkspace {
  const job = ingestDischargePacket(fileName);
  const { workspace } = parseDischargePacket(job, template);
  return addWorkspace(workspace);
}

export function addStaffNote(
  patientId: string,
  text: string,
  sectionId?: string,
  author = 'Staff Member'
): StaffNote | undefined {
  const ws = getWorkspace(patientId);
  if (!ws) return undefined;

  const note: StaffNote = {
    id: `note_${Date.now()}`,
    patientId,
    sectionId,
    text,
    author,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updated: PatientWorkspace = {
    ...ws,
    staffNotes: [note, ...ws.staffNotes],
  };
  addWorkspace(updated);
  return note;
}

export function recordQuestionAnswer(
  patientId: string,
  question: AIQuestion,
  answer: AIAnswer
): { question: AIQuestion; answer: AIAnswer } | undefined {
  const ws = getWorkspace(patientId);
  if (!ws) return undefined;

  const updated: PatientWorkspace = {
    ...ws,
    questions: [question, ...ws.questions],
    answers: [answer, ...ws.answers],
  };
  addWorkspace(updated);
  return { question, answer };
}

export function askQuestion(patientId: string, text: string): { question: AIQuestion; answer: AIAnswer } | undefined {
  const ws = getWorkspace(patientId);
  if (!ws) return undefined;

  const question: AIQuestion = {
    id: `q_${Date.now()}`,
    patientId,
    text,
    askedAt: new Date().toISOString(),
  };

  const answer = generateMockAnswer(ws, question);
  return recordQuestionAnswer(patientId, question, answer);
}

function generateMockAnswer(ws: PatientWorkspace, question: AIQuestion): AIAnswer {
  const lower = question.text.toLowerCase();
  let text = '';
  const references = [];

  if (lower.includes('med') || lower.includes('drug') || lower.includes('amoxicillin')) {
    const medSection = ws.sections.find((s) => s.category === 'medications');
    const allergySection = ws.sections.find((s) => s.category === 'allergies');
    if (medSection) {
      text = `Based on the discharge packet, active medications include:\n\n${medSection.content}`;
      if (allergySection && ws.sections.some((s) => s.flags?.length)) {
        text += `\n\n⚠️ Note: There is a documented conflict between the allergy list and medication orders. Human review is required before administration.`;
      }
      const doc = ws.sourceDocuments.find((d) => d.id === medSection.sourceDocumentId);
      if (doc) {
        references.push({
          id: `ref_${Date.now()}`,
          sectionId: medSection.id,
          documentId: doc.id,
          page: doc.pageStart,
          excerpt: medSection.content.split('\n')[0],
          label: `Source Linked — ${doc.title}, ${medSection.pageRef}`,
        });
      }
    }
  } else if (lower.includes('wound') || lower.includes('pressure')) {
    const woundSection = ws.sections.find((s) => s.category === 'wound_care');
    if (woundSection?.status === 'missing') {
      text =
        'No wound care instructions were found in this discharge packet. I recommend contacting the sending hospital to obtain wound care orders before initiating treatment.';
    } else if (woundSection) {
      text = `Wound care instructions from the discharge packet:\n\n${woundSection.content}`;
      const doc = ws.sourceDocuments.find((d) => d.id === woundSection.sourceDocumentId);
      if (doc) {
        references.push({
          id: `ref_${Date.now()}_w`,
          sectionId: woundSection.id,
          documentId: doc.id,
          page: doc.pageStart,
          excerpt: woundSection.content.split('\n')[0],
          label: `Source Linked — ${doc.title}, ${woundSection.pageRef}`,
        });
      }
    }
  } else if (lower.includes('allerg')) {
    const allergySection = ws.sections.find((s) => s.category === 'allergies');
    if (allergySection) {
      text = `Documented allergies:\n\n${allergySection.content}`;
      const doc = ws.sourceDocuments.find((d) => d.id === allergySection.sourceDocumentId);
      if (doc) {
        references.push({
          id: `ref_${Date.now()}_a`,
          sectionId: allergySection.id,
          documentId: doc.id,
          page: doc.pageStart,
          excerpt: allergySection.content.split('\n')[0],
          label: `Source Linked — ${doc.title}, ${allergySection.pageRef}`,
        });
      }
    }
  } else if (lower.includes('therapy') || lower.includes('pt') || lower.includes('ot')) {
    const therapySection = ws.sections.find((s) => s.category === 'therapy');
    if (therapySection) {
      text = `Therapy orders:\n\n${therapySection.content}`;
      const doc = ws.sourceDocuments.find((d) => d.id === therapySection.sourceDocumentId);
      if (doc) {
        references.push({
          id: `ref_${Date.now()}_t`,
          sectionId: therapySection.id,
          documentId: doc.id,
          page: doc.pageStart,
          excerpt: therapySection.content.split('\n')[0],
          label: `Source Linked — ${doc.title}, ${therapySection.pageRef}`,
        });
      }
    }
  } else {
    const overview = ws.sections.find((s) => s.category === 'overview');
    text = overview
      ? `Here is a summary from the patient workspace:\n\n${overview.content}\n\nAsk about medications, allergies, wound care, therapy, or follow-ups for more specific answers with source links.`
      : 'I could not find specific information for that question. Try asking about medications, allergies, wound care, therapy orders, or follow-up appointments.';
  }

  return {
    id: `ans_${Date.now()}`,
    questionId: question.id,
    text,
    references,
    disclaimer: 'Not medical advice. AI answers must cite source sections. Human review required.',
    answeredAt: new Date().toISOString(),
  };
}

export function searchWorkspaces(query: string): PatientWorkspace[] {
  const q = query.toLowerCase().trim();
  if (!q) return listWorkspaces();
  return listWorkspaces().filter(
    (w) =>
      w.patient.name.toLowerCase().includes(q) ||
      w.patient.mrn.toLowerCase().includes(q) ||
      w.sections.some((s) => s.content.toLowerCase().includes(q) || s.title.toLowerCase().includes(q))
  );
}

export function resetToMockData(): void {
  workspaces = [...MOCK_WORKSPACES];
  saveToStorage(workspaces);
}
