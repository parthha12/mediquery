import type {
  DischargePacket,
  DocumentSection,
  IngestJob,
  MockPacketTemplate,
  Patient,
  PatientWorkspace,
  SourceDocument,
  SourceReference,
  StaffNote,
} from '@/types';

const uid = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const MOCK_PATIENTS: Record<MockPacketTemplate, Omit<Patient, 'id'>> = {
  complete: {
    name: 'Eleanor Whitfield',
    mrn: 'SNF-10482',
    dob: '1942-03-14',
    admitDate: '2026-06-10',
    roomNumber: '214B',
    attendingPhysician: 'Dr. Sarah Chen',
  },
  missing_wound_care: {
    name: 'Robert Martinez',
    mrn: 'SNF-10891',
    dob: '1955-11-22',
    admitDate: '2026-06-12',
    roomNumber: '118A',
    attendingPhysician: 'Dr. James Okonkwo',
  },
  conflicting_meds: {
    name: 'Dorothy Nguyen',
    mrn: 'SNF-11003',
    dob: '1938-07-08',
    admitDate: '2026-06-14',
    roomNumber: '302C',
    attendingPhysician: 'Dr. Priya Sharma',
  },
  missing_therapy: {
    name: 'James Cooper',
    mrn: 'SNF-11204',
    dob: '1948-02-19',
    admitDate: '2026-06-15',
    roomNumber: '205A',
    attendingPhysician: 'Dr. Elena Vasquez',
  },
  incomplete_insurance: {
    name: 'Linda Park',
    mrn: 'SNF-11317',
    dob: '1950-09-03',
    admitDate: '2026-06-16',
    roomNumber: '119B',
    attendingPhysician: 'Dr. Michael Torres',
  },
};

function detectTemplate(fileName: string): MockPacketTemplate {
  const lower = fileName.toLowerCase();
  if (lower.includes('martinez') || lower.includes('missing') || lower.includes('wound')) {
    return 'missing_wound_care';
  }
  if (lower.includes('nguyen') || lower.includes('conflict') || lower.includes('allergy')) {
    return 'conflicting_meds';
  }
  if (lower.includes('cooper') || lower.includes('therapy') || lower.includes('pt_ot')) {
    return 'missing_therapy';
  }
  if (lower.includes('park') || lower.includes('insurance') || lower.includes('auth')) {
    return 'incomplete_insurance';
  }
  return 'complete';
}

export function ingestDischargePacket(fileName: string): IngestJob {
  return {
    id: uid('job'),
    fileName,
    status: 'queued',
    startedAt: new Date().toISOString(),
  };
}

export function parseDischargePacket(
  job: IngestJob,
  template?: MockPacketTemplate
): { job: IngestJob; workspace: PatientWorkspace } {
  const resolvedTemplate = template ?? detectTemplate(job.fileName);
  const patientId = uid('patient');
  const packetId = uid('packet');
  const patient: Patient = { id: patientId, ...MOCK_PATIENTS[resolvedTemplate] };

  const packet: DischargePacket = {
    id: packetId,
    patientId,
    fileName: job.fileName,
    uploadedAt: new Date().toISOString(),
    pageCount: resolvedTemplate === 'complete' ? 24 : resolvedTemplate === 'incomplete_insurance' ? 16 : 18,
    status: 'complete',
  };

  const sourceDocuments = createSourceDocuments(patientId, packetId, resolvedTemplate);
  const sections = classifySections(patientId, sourceDocuments, resolvedTemplate);
  const overview = extractPatientOverview(patient, sections, resolvedTemplate);

  const workspace = buildPatientWorkspace({
    patient,
    packet,
    sections: [overview, ...sections.filter((s) => s.category !== 'overview')],
    sourceDocuments,
    staffNotes: [],
    questions: [],
    answers: [],
  });

  const completedJob: IngestJob = {
    ...job,
    status: 'complete',
    patientId,
    completedAt: new Date().toISOString(),
  };

  return { job: completedJob, workspace };
}

export function createSourceDocuments(
  patientId: string,
  packetId: string,
  template: MockPacketTemplate
): SourceDocument[] {
  const docs: { title: string; pages: [number, number]; text: string }[] = [
    {
      title: 'Hospital Discharge Summary',
      pages: [1, 4],
      text: 'Discharge summary with primary diagnoses, hospital course, and disposition to SNF.',
    },
    {
      title: 'Medication Reconciliation',
      pages: [5, 8],
      text: 'Active medication list at discharge with dosing instructions.',
    },
    {
      title: 'Allergy & Intolerance List',
      pages: [9, 9],
      text: template === 'conflicting_meds'
        ? 'Penicillin — rash (documented). Sulfa — unknown reaction noted on nursing sheet.'
        : 'Penicillin — rash. No other known drug allergies.',
    },
    {
      title: 'Lab Results (Recent)',
      pages: [10, 12],
      text: 'CBC, BMP, HbA1c within last 72 hours of discharge.',
    },
  ];

  if (template !== 'missing_wound_care') {
    docs.push({
      title: 'Wound Care Orders',
      pages: [13, 14],
      text: 'Stage II sacral pressure injury. Cleanse with NS, apply hydrocolloid dressing BID.',
    });
  }

  docs.push(
    {
      title: 'Therapy Orders',
      pages: [15, 16],
      text: 'PT 5x/week × 2 weeks, OT 3x/week. Weight-bearing as tolerated.',
    },
    {
      title: 'Diet & Nutrition',
      pages: [17, 17],
      text: 'Diabetic diet, 1800 kcal. Fluid restriction 1500 mL/day.',
    },
    {
      title: 'Follow-up Appointments',
      pages: [18, 18],
      text: 'PCP follow-up in 7 days. Cardiology in 14 days.',
    }
  );

  return docs.map((d) => ({
    id: uid('doc'),
    patientId,
    packetId,
    title: d.title,
    pageStart: d.pages[0],
    pageEnd: d.pages[1],
    rawText: d.text,
  }));
}

export function classifySections(
  patientId: string,
  sourceDocuments: SourceDocument[],
  template: MockPacketTemplate
): DocumentSection[] {
  const findDoc = (title: string) => sourceDocuments.find((d) => d.title.includes(title));

  const sections: DocumentSection[] = [
    {
      id: uid('sec'),
      patientId,
      category: 'diagnoses',
      title: 'Diagnoses',
      content:
        template === 'complete'
          ? '1. Acute on chronic systolic heart failure (I50.23)\n2. Type 2 diabetes mellitus with hyperglycemia (E11.65)\n3. Stage II sacral pressure injury (L89.152)\n4. Hypertension (I10)'
          : template === 'missing_wound_care'
            ? '1. COPD exacerbation, resolved (J44.1)\n2. Generalized weakness (R53.1)\n3. History of stage II pressure injury — wound care orders NOT included in packet'
            : template === 'missing_therapy'
              ? '1. Left hip fracture, post ORIF (S72.002A)\n2. Anemia due to blood loss (D62)\n3. Hypertension (I10)'
              : template === 'incomplete_insurance'
                ? '1. Community-acquired pneumonia, resolved (J18.9)\n2. Type 2 diabetes mellitus (E11.9)\n3. Mild cognitive impairment (G31.84)'
                : '1. Atrial fibrillation (I48.91)\n2. Chronic kidney disease stage 3 (N18.3)\n3. Osteoarthritis (M19.90)',
      status: 'complete',
      sourceDocumentId: findDoc('Discharge Summary')?.id ?? '',
      pageRef: 'pp. 2–3',
    },
    {
      id: uid('sec'),
      patientId,
      category: 'medications',
      title: 'Medications',
      content:
        template === 'conflicting_meds'
          ? '• Amoxicillin 500 mg PO TID × 7 days (started at hospital)\n• Metoprolol succinate 50 mg PO daily\n• Warfarin 5 mg PO daily\n• Lisinopril 10 mg PO daily\n• Acetaminophen 650 mg PO q6h PRN pain'
          : template === 'complete'
            ? '• Furosemide 40 mg PO daily\n• Metformin 500 mg PO BID\n• Lisinopril 10 mg PO daily\n• Aspirin 81 mg PO daily\n• Acetaminophen 650 mg PO q6h PRN'
            : template === 'missing_therapy'
              ? '• Oxycodone 5 mg PO q6h PRN pain\n• Enoxaparin 40 mg SQ daily\n• Acetaminophen 650 mg PO q6h PRN\n• Docusate 100 mg PO BID'
              : template === 'incomplete_insurance'
                ? '• Azithromycin 500 mg PO daily × 2 more days\n• Metformin 500 mg PO BID\n• Atorvastatin 20 mg PO nightly\n• Albuterol inhaler PRN'
                : '• Albuterol inhaler 2 puffs q4h PRN\n• Tiotropium 18 mcg inhaled daily\n• Prednisone taper — day 3 of 5\n• Omeprazole 20 mg PO daily',
      status: template === 'conflicting_meds' ? 'human_review_required' : 'complete',
      sourceDocumentId: findDoc('Medication')?.id ?? '',
      pageRef: 'pp. 5–7',
      flags: template === 'conflicting_meds' ? ['Penicillin allergy documented but amoxicillin ordered'] : undefined,
    },
    {
      id: uid('sec'),
      patientId,
      category: 'allergies',
      title: 'Allergies',
      content:
        template === 'conflicting_meds'
          ? 'Penicillin — rash (documented in allergy list, p. 9)\nSulfa — reaction noted on nursing transfer sheet but NOT in formal allergy list'
          : 'Penicillin — rash\nNo other known drug allergies (NKDA on summary, p. 9)',
      status: template === 'conflicting_meds' ? 'needs_review' : 'complete',
      sourceDocumentId: findDoc('Allergy')?.id ?? '',
      pageRef: 'p. 9',
      flags: template === 'conflicting_meds' ? ['Conflict between allergy list and active medication'] : undefined,
    },
    {
      id: uid('sec'),
      patientId,
      category: 'labs',
      title: 'Labs',
      content:
        '• WBC 7.2 K/µL\n• Hgb 11.8 g/dL\n• Creatinine 1.4 mg/dL\n• eGFR 48 mL/min\n• HbA1c 7.9%\n• INR 2.1 (if on anticoagulation)',
      status: 'complete',
      sourceDocumentId: findDoc('Lab')?.id ?? '',
      pageRef: 'pp. 10–12',
    },
  ];

  if (template !== 'missing_wound_care') {
    sections.push({
      id: uid('sec'),
      patientId,
      category: 'wound_care',
      title: 'Wound Care',
      content:
        'Stage II sacral pressure injury.\nCleanse with normal saline, pat dry.\nApply hydrocolloid dressing BID.\nReposition q2h, offload sacrum.',
      status: 'complete',
      sourceDocumentId: findDoc('Wound')?.id ?? '',
      pageRef: 'pp. 13–14',
    });
  } else {
    sections.push({
      id: uid('sec'),
      patientId,
      category: 'wound_care',
      title: 'Wound Care',
      content: 'No wound care instructions found in discharge packet.',
      status: 'missing',
      sourceDocumentId: '',
      pageRef: '—',
      flags: ['Wound care section missing from packet — verify with sending facility'],
    });
  }

  if (template === 'missing_therapy') {
    sections.push({
      id: uid('sec'),
      patientId,
      category: 'therapy',
      title: 'Therapy Orders',
      content: 'No PT/OT orders found in discharge packet.',
      status: 'missing',
      sourceDocumentId: '',
      pageRef: '—',
      flags: ['Therapy orders missing — request orders before starting rehab'],
    });
  } else {
    sections.push({
      id: uid('sec'),
      patientId,
      category: 'therapy',
      title: 'Therapy Orders',
      content: 'PT 5×/week × 2 weeks. OT 3×/week. Ambulate with rolling walker, supervision required.',
      status: 'complete',
      sourceDocumentId: findDoc('Therapy')?.id ?? '',
      pageRef: 'pp. 15–16',
    });
  }

  sections.push(
    {
      id: uid('sec'),
      patientId,
      category: 'diet',
      title: 'Diet Orders',
      content: 'Diabetic diet, 1800 kcal. Fluid restriction 1500 mL/day. Regular texture.',
      status: 'complete',
      sourceDocumentId: findDoc('Diet')?.id ?? '',
      pageRef: 'p. 17',
    },
    {
      id: uid('sec'),
      patientId,
      category: 'follow_ups',
      title: 'Follow-up Appointments',
      content: 'PCP: Dr. Adams — 7 days post-discharge\nCardiology: 14 days\nWound clinic: PRN if no improvement in 5 days',
      status: 'ai_suggested',
      sourceDocumentId: findDoc('Follow-up')?.id ?? '',
      pageRef: 'p. 18',
    },
    {
      id: uid('sec'),
      patientId,
      category: 'insurance',
      title: 'Insurance / Authorization',
      content:
        template === 'incomplete_insurance'
          ? 'Medicare Part A referenced on face sheet.\nPrior auth number: NOT FOUND in packet.\nSNF benefit days remaining: unclear — verify with billing.'
          : 'Medicare Part A — SNF days remaining: 18\nPrior auth #: AUTH-2026-44821\nSkilled nursing coverage through 2026-07-08',
      status: template === 'incomplete_insurance' ? 'needs_review' : 'complete',
      sourceDocumentId: findDoc('Discharge Summary')?.id ?? '',
      pageRef: 'p. 4',
      flags:
        template === 'incomplete_insurance'
          ? ['Prior authorization number missing from discharge packet']
          : undefined,
    }
  );

  return sections;
}

export function extractPatientOverview(
  patient: Patient,
  sections: DocumentSection[],
  template: MockPacketTemplate
): DocumentSection {
  const flags: string[] = [];
  if (template === 'missing_wound_care') flags.push('Wound care instructions missing');
  if (template === 'conflicting_meds') flags.push('Medication/allergy conflict detected');
  if (template === 'missing_therapy') flags.push('Therapy orders missing from packet');
  if (template === 'incomplete_insurance') flags.push('Insurance authorization incomplete');

  const primaryDx = sections.find((s) => s.category === 'diagnoses');
  const medCount = (sections.find((s) => s.category === 'medications')?.content.match(/•/g) ?? []).length;

  return {
    id: uid('sec'),
    patientId: patient.id,
    category: 'overview',
    title: 'Patient Overview',
    content: [
      `Patient: ${patient.name}`,
      `MRN: ${patient.mrn}`,
      `DOB: ${patient.dob}`,
      `Admit date: ${patient.admitDate}`,
      patient.roomNumber ? `Room: ${patient.roomNumber}` : '',
      patient.attendingPhysician ? `Attending: ${patient.attendingPhysician}` : '',
      '',
      `Primary diagnoses: ${primaryDx?.content.split('\n')[0] ?? 'See Diagnoses section'}`,
      `Active medications: ${medCount}`,
      flags.length ? `\nFlags: ${flags.join('; ')}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    status: flags.length ? 'needs_review' : 'complete',
    sourceDocumentId: '',
    pageRef: 'Summary',
    flags: flags.length ? flags : undefined,
  };
}

export function buildPatientWorkspace(partial: PatientWorkspace): PatientWorkspace {
  return {
    ...partial,
    sections: partial.sections,
    sourceDocuments: partial.sourceDocuments,
    staffNotes: partial.staffNotes ?? [],
    questions: partial.questions ?? [],
    answers: partial.answers ?? [],
  };
}

export function createSourceReferences(
  sections: DocumentSection[],
  sourceDocuments: SourceDocument[]
): SourceReference[] {
  return sections.flatMap((section) => {
    if (!section.sourceDocumentId) return [];
    const doc = sourceDocuments.find((d) => d.id === section.sourceDocumentId);
    if (!doc) return [];
    const excerpt = section.content.split('\n')[0].slice(0, 120);
    return [
      {
        id: uid('ref'),
        sectionId: section.id,
        documentId: doc.id,
        page: doc.pageStart,
        excerpt,
        label: `${doc.title} — ${section.pageRef}`,
      },
    ];
  });
}

export { MOCK_PATIENTS, detectTemplate };
