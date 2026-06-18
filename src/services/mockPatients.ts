import type { AIAnswer, AIQuestion, MockPacketTemplate, PatientWorkspace } from '@/types';
import {
  buildPatientWorkspace,
  classifySections,
  createSourceDocuments,
  extractPatientOverview,
} from './dischargeParser';

function seedChatHistory(
  workspace: PatientWorkspace,
  pairs: { question: string; answerText: string; sectionCategory?: string }[]
): PatientWorkspace {
  const questions: AIQuestion[] = [];
  const answers: AIAnswer[] = [];

  pairs.forEach((pair, i) => {
    const questionId = `q_seed_${workspace.patient.id}_${i}`;
    const section = pair.sectionCategory
      ? workspace.sections.find((s) => s.category === pair.sectionCategory)
      : undefined;
    const doc = section?.sourceDocumentId
      ? workspace.sourceDocuments.find((d) => d.id === section.sourceDocumentId)
      : undefined;

    questions.push({
      id: questionId,
      patientId: workspace.patient.id,
      text: pair.question,
      askedAt: new Date(Date.now() - 86400000 * (i + 1)).toISOString(),
    });

    answers.push({
      id: `ans_seed_${workspace.patient.id}_${i}`,
      questionId,
      text: pair.answerText,
      references:
        section && doc
          ? [
              {
                id: `ref_seed_${workspace.patient.id}_${i}`,
                sectionId: section.id,
                documentId: doc.id,
                page: doc.pageStart,
                excerpt: section.content.split('\n')[0].slice(0, 120),
                label: `Source Linked — ${doc.title}, ${section.pageRef}`,
              },
            ]
          : [],
      disclaimer: 'Not medical advice. AI answers must cite source sections. Human review required.',
      answeredAt: new Date(Date.now() - 86400000 * (i + 1) + 60000).toISOString(),
    });
  });

  return { ...workspace, questions, answers };
}

function buildMockWorkspace(
  template: MockPacketTemplate,
  patientId: string,
  packetId: string,
  fileName: string,
  patientData: {
    name: string;
    mrn: string;
    dob: string;
    admitDate: string;
    roomNumber: string;
    attendingPhysician: string;
  },
  extras?: {
    staffNotes?: PatientWorkspace['staffNotes'];
    chatPairs?: { question: string; answerText: string; sectionCategory?: string }[];
  }
): PatientWorkspace {
  const patient = { id: patientId, ...patientData };
  const packet = {
    id: packetId,
    patientId,
    fileName,
    uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    pageCount: template === 'complete' ? 24 : template === 'incomplete_insurance' ? 16 : 18,
    status: 'complete' as const,
  };
  const sourceDocuments = createSourceDocuments(patientId, packetId, template);
  const sections = classifySections(patientId, sourceDocuments, template);
  const overview = extractPatientOverview(patient, sections, template);

  let workspace = buildPatientWorkspace({
    patient,
    packet,
    sections: [overview, ...sections.filter((s) => s.category !== 'overview')],
    sourceDocuments,
    staffNotes: extras?.staffNotes ?? [],
    questions: [],
    answers: [],
  });

  if (extras?.chatPairs?.length) {
    workspace = seedChatHistory(workspace, extras.chatPairs);
  }

  return workspace;
}

export const MOCK_WORKSPACES: PatientWorkspace[] = [
  buildMockWorkspace(
    'complete',
    'patient_whitfield',
    'packet_whitfield',
    'Whitfield_Eleanor_Discharge_2026-06-10.pdf',
    {
      name: 'Eleanor Whitfield',
      mrn: 'SNF-10482',
      dob: '1942-03-14',
      admitDate: '2026-06-10',
      roomNumber: '214B',
      attendingPhysician: 'Dr. Sarah Chen',
    },
    {
      staffNotes: [
        {
          id: 'note_seed_1',
          patientId: 'patient_whitfield',
          text: 'Pharmacy verified home meds match discharge list.',
          author: 'Nurse Patel',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
      chatPairs: [
        {
          question: 'What medications is this patient on?',
          answerText:
            'Active medications include Furosemide 40 mg daily, Metformin 500 mg BID, Lisinopril 10 mg daily, Aspirin 81 mg daily, and Acetaminophen PRN.',
          sectionCategory: 'medications',
        },
      ],
    }
  ),
  buildMockWorkspace(
    'missing_wound_care',
    'patient_martinez',
    'packet_martinez',
    'Martinez_Robert_Discharge_2026-06-12.pdf',
    {
      name: 'Robert Martinez',
      mrn: 'SNF-10891',
      dob: '1955-11-22',
      admitDate: '2026-06-12',
      roomNumber: '118A',
      attendingPhysician: 'Dr. James Okonkwo',
    },
    {
      staffNotes: [
        {
          id: 'note_seed_2',
          patientId: 'patient_martinez',
          text: 'Called sending hospital — wound care orders faxed, awaiting receipt.',
          author: 'Admissions RN Lee',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          updatedAt: new Date(Date.now() - 7200000).toISOString(),
        },
      ],
      chatPairs: [
        {
          question: 'What are the wound care instructions?',
          answerText:
            'No wound care instructions were found in this discharge packet. Contact the sending hospital before initiating treatment.',
          sectionCategory: 'wound_care',
        },
      ],
    }
  ),
  buildMockWorkspace(
    'conflicting_meds',
    'patient_nguyen',
    'packet_nguyen',
    'Nguyen_Dorothy_Discharge_2026-06-14.pdf',
    {
      name: 'Dorothy Nguyen',
      mrn: 'SNF-11003',
      dob: '1938-07-08',
      admitDate: '2026-06-14',
      roomNumber: '302C',
      attendingPhysician: 'Dr. Priya Sharma',
    },
    {
      chatPairs: [
        {
          question: 'Are there any allergy conflicts?',
          answerText:
            'Yes — Penicillin allergy is documented but Amoxicillin 500 mg TID is on the active medication list. Human review required before administration.',
          sectionCategory: 'medications',
        },
      ],
    }
  ),
  buildMockWorkspace(
    'missing_therapy',
    'patient_cooper',
    'packet_cooper',
    'Cooper_James_Discharge_2026-06-15.pdf',
    {
      name: 'James Cooper',
      mrn: 'SNF-11204',
      dob: '1948-02-19',
      admitDate: '2026-06-15',
      roomNumber: '205A',
      attendingPhysician: 'Dr. Elena Vasquez',
    },
    {
      chatPairs: [
        {
          question: 'What therapy orders were included?',
          answerText:
            'No PT/OT orders were found in the discharge packet. Request therapy orders before starting rehab.',
          sectionCategory: 'therapy',
        },
      ],
    }
  ),
  buildMockWorkspace(
    'incomplete_insurance',
    'patient_park',
    'packet_park',
    'Park_Linda_Discharge_2026-06-16.pdf',
    {
      name: 'Linda Park',
      mrn: 'SNF-11317',
      dob: '1950-09-03',
      admitDate: '2026-06-16',
      roomNumber: '119B',
      attendingPhysician: 'Dr. Michael Torres',
    },
    {
      staffNotes: [
        {
          id: 'note_seed_5',
          patientId: 'patient_park',
          text: 'Billing flagged missing prior auth — case manager following up.',
          author: 'Case Manager Diaz',
          createdAt: new Date(Date.now() - 1800000).toISOString(),
          updatedAt: new Date(Date.now() - 1800000).toISOString(),
        },
      ],
    }
  ),
];

export const MOCK_PACKET_OPTIONS = [
  {
    template: 'complete' as MockPacketTemplate,
    label: 'Complete discharge packet',
    fileName: 'Whitfield_Eleanor_Discharge_2026-06-10.pdf',
    description: 'Full packet with all sections populated — Eleanor Whitfield',
  },
  {
    template: 'missing_wound_care' as MockPacketTemplate,
    label: 'Missing wound care instructions',
    fileName: 'Martinez_Robert_Discharge_2026-06-12.pdf',
    description: 'Packet missing wound care section — Robert Martinez',
  },
  {
    template: 'conflicting_meds' as MockPacketTemplate,
    label: 'Conflicting med/allergy information',
    fileName: 'Nguyen_Dorothy_Discharge_2026-06-14.pdf',
    description: 'Penicillin allergy documented but amoxicillin ordered — Dorothy Nguyen',
  },
  {
    template: 'missing_therapy' as MockPacketTemplate,
    label: 'Missing therapy orders',
    fileName: 'Cooper_James_Discharge_2026-06-15.pdf',
    description: 'Post-hip fracture packet with no PT/OT orders — James Cooper',
  },
  {
    template: 'incomplete_insurance' as MockPacketTemplate,
    label: 'Incomplete insurance authorization',
    fileName: 'Park_Linda_Discharge_2026-06-16.pdf',
    description: 'Prior auth number missing from packet — Linda Park',
  },
];
