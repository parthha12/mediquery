import type { DocumentSection, MedicationEvent, PatientWorkspace, SourceDocument, SourceKind } from '@/types';
import { summarizeReconciliation, detectConflicts } from './reconciliation';

const PATIENT_ID = 'patient_margaret';

function doc(
  id: string,
  title: string,
  pages: [number, number],
  rawText: string
): SourceDocument {
  return {
    id,
    patientId: PATIENT_ID,
    packetId: 'packet_margaret',
    title,
    pageStart: pages[0],
    pageEnd: pages[1],
    rawText,
  };
}

function event(
  partial: Omit<MedicationEvent, 'patientId' | 'extractionConfidence'> & { extractionConfidence?: number }
): MedicationEvent {
  return { patientId: PATIENT_ID, extractionConfidence: 0.91, ...partial };
}

export function buildMargaretWorkspace(): PatientWorkspace {
  const sourceDocuments: SourceDocument[] = [
    doc(
      'doc_hospital',
      'Hospital Discharge Summary',
      [1, 18],
      'Eliquis started. Lisinopril discontinued for hypotension. Metformin increased 500→1000 mg. Insulin glargine increased 10→14 units.'
    ),
    doc(
      'doc_snf',
      'SNF Medication List',
      [1, 6],
      'Lisinopril 10 mg PO daily still listed as active. Eliquis and metformin continued. Aspirin omitted during retype.'
    ),
    doc(
      'doc_pharmacy',
      'Pharmacy Fill History',
      [1, 3],
      'Filled Eliquis 5 mg BID, metformin 1000 mg BID, atorvastatin, no aspirin fills after hospital discharge.'
    ),
    doc(
      'doc_referral',
      'Home Health Referral',
      [1, 4],
      'Start of care requested. Reconcile meds before first visit. Family reports BP pills still in the weekly organizer.'
    ),
    doc('doc_labs', 'Hospital Labs', [19, 22], 'Creatinine 1.3. HbA1c 7.6%. INR pending on Eliquis.'),
  ];

  const events: MedicationEvent[] = [
    event({
      id: 'evt_eliquis_h',
      medicationNameRaw: 'Eliquis 5 mg',
      medicationNameNormalized: 'eliquis',
      dose: '5',
      unit: 'mg',
      route: 'PO',
      frequency: 'BID',
      action: 'START',
      eventDate: '2026-09-04',
      reason: 'New atrial fibrillation',
      sourceDocumentId: 'doc_hospital',
      sourceKind: 'hospital',
      sourceTitle: 'Hospital discharge',
      sourcePage: 8,
      sourceText: 'Start Eliquis 5 mg PO BID for new AFib',
    }),
    event({
      id: 'evt_eliquis_s',
      medicationNameRaw: 'Eliquis',
      medicationNameNormalized: 'eliquis',
      dose: '5',
      unit: 'mg',
      frequency: 'BID',
      action: 'CONTINUE',
      eventDate: '2026-09-12',
      sourceDocumentId: 'doc_snf',
      sourceKind: 'snf',
      sourceTitle: 'SNF med list',
      sourcePage: 2,
      sourceText: 'Eliquis 5 mg PO BID',
    }),
    event({
      id: 'evt_eliquis_p',
      medicationNameRaw: 'Eliquis tablet',
      medicationNameNormalized: 'eliquis',
      dose: '5',
      unit: 'mg',
      frequency: 'BID',
      action: 'CONTINUE',
      eventDate: '2026-09-14',
      sourceDocumentId: 'doc_pharmacy',
      sourceKind: 'pharmacy',
      sourceTitle: 'Pharmacy list',
      sourcePage: 1,
      sourceText: 'Filled Eliquis 5 mg BID × 30 days',
    }),
    event({
      id: 'evt_lisinopril_h',
      medicationNameRaw: 'Lisinopril 10 mg',
      medicationNameNormalized: 'lisinopril',
      dose: '10',
      unit: 'mg',
      frequency: 'daily',
      action: 'STOP',
      eventDate: '2026-09-04',
      reason: 'hypotension',
      sourceDocumentId: 'doc_hospital',
      sourceKind: 'hospital',
      sourceTitle: 'Hospital discharge',
      sourcePage: 14,
      sourceText: 'Discontinue lisinopril 10 mg daily due to hypotension',
    }),
    event({
      id: 'evt_lisinopril_s',
      medicationNameRaw: 'Lisinopril tablet',
      medicationNameNormalized: 'lisinopril',
      dose: '10',
      unit: 'mg',
      frequency: 'daily',
      action: 'CONTINUE',
      eventDate: '2026-09-12',
      sourceDocumentId: 'doc_snf',
      sourceKind: 'snf',
      sourceTitle: 'SNF med list',
      sourcePage: 3,
      sourceText: 'Lisinopril 10 mg PO daily',
    }),
    event({
      id: 'evt_metformin_h',
      medicationNameRaw: 'Metformin',
      medicationNameNormalized: 'metformin',
      dose: '1000',
      unit: 'mg',
      frequency: 'BID',
      action: 'CHANGE',
      eventDate: '2026-09-04',
      reason: '500 mg → 1000 mg',
      sourceDocumentId: 'doc_hospital',
      sourceKind: 'hospital',
      sourceTitle: 'Hospital discharge',
      sourcePage: 9,
      sourceText: 'Increase metformin from 500 mg to 1000 mg PO BID',
    }),
    event({
      id: 'evt_metformin_s',
      medicationNameRaw: 'Metformin 1000mg',
      medicationNameNormalized: 'metformin',
      dose: '1000',
      unit: 'mg',
      frequency: 'BID',
      action: 'CONTINUE',
      eventDate: '2026-09-12',
      sourceDocumentId: 'doc_snf',
      sourceKind: 'snf',
      sourceTitle: 'SNF med list',
      sourcePage: 2,
      sourceText: 'Metformin 1000 mg PO BID',
    }),
    event({
      id: 'evt_aspirin_h',
      medicationNameRaw: 'Aspirin 81 mg',
      medicationNameNormalized: 'aspirin',
      dose: '81',
      unit: 'mg',
      frequency: 'daily',
      action: 'CONTINUE',
      eventDate: '2026-09-04',
      sourceDocumentId: 'doc_hospital',
      sourceKind: 'hospital',
      sourceTitle: 'Hospital discharge',
      sourcePage: 10,
      sourceText: 'Continue aspirin 81 mg daily',
    }),
    event({
      id: 'evt_insulin_h',
      medicationNameRaw: 'Insulin glargine',
      medicationNameNormalized: 'insulin glargine',
      dose: '14',
      unit: 'units',
      frequency: 'nightly',
      action: 'CHANGE',
      eventDate: '2026-09-04',
      reason: '10 → 14 units',
      sourceDocumentId: 'doc_hospital',
      sourceKind: 'hospital',
      sourceTitle: 'Hospital discharge',
      sourcePage: 11,
      sourceText: 'Increase insulin glargine from 10 to 14 units nightly',
    }),
    event({
      id: 'evt_insulin_s',
      medicationNameRaw: 'Insulin glargine',
      medicationNameNormalized: 'insulin glargine',
      dose: '14',
      unit: 'units',
      frequency: 'nightly',
      action: 'CONTINUE',
      eventDate: '2026-09-12',
      sourceDocumentId: 'doc_snf',
      sourceKind: 'snf',
      sourceTitle: 'SNF med list',
      sourcePage: 4,
      sourceText: 'Insulin glargine 14 units QHS',
    }),
    ...stable('atorvastatin', 'Atorvastatin 40 mg', '40', 'mg', 'nightly', 12),
    ...stable('furosemide', 'Furosemide 20 mg', '20', 'mg', 'daily', 13),
    ...stable('pantoprazole', 'Pantoprazole 40 mg', '40', 'mg', 'daily', 14),
    ...stable('levothyroxine', 'Levothyroxine 75 mcg', '75', 'mcg', 'daily', 15),
    ...stable('cholecalciferol', 'Vitamin D 1000 IU', '1000', 'IU', 'daily', 16),
    ...stable('acetaminophen', 'Acetaminophen 650 mg', '650', 'mg', 'PRN', 17),
    event({
      id: 'evt_kcl_s',
      medicationNameRaw: 'Potassium chloride 20 mEq',
      medicationNameNormalized: 'potassium chloride',
      dose: '20',
      unit: 'mEq',
      frequency: 'daily',
      action: 'CONTINUE',
      eventDate: '2026-09-12',
      reason: 'Added at SNF after low K',
      sourceDocumentId: 'doc_snf',
      sourceKind: 'snf',
      sourceTitle: 'SNF med list',
      sourcePage: 5,
      sourceText: 'Start potassium chloride 20 mEq daily',
    }),
  ];

  function stable(
    key: string,
    raw: string,
    dose: string,
    unit: string,
    frequency: string,
    page: number
  ): MedicationEvent[] {
    const kinds: { kind: SourceKind; id: string; title: string; date: string; page: number }[] = [
      { kind: 'hospital', id: 'doc_hospital', title: 'Hospital discharge', date: '2026-09-04', page },
      { kind: 'snf', id: 'doc_snf', title: 'SNF med list', date: '2026-09-12', page: 2 },
      { kind: 'pharmacy', id: 'doc_pharmacy', title: 'Pharmacy list', date: '2026-09-14', page: 1 },
    ];
    return kinds.map((src) =>
      event({
        id: `evt_${key}_${src.kind}`,
        medicationNameRaw: raw,
        medicationNameNormalized: key,
        dose,
        unit,
        frequency,
        action: 'CONTINUE',
        eventDate: src.date,
        sourceDocumentId: src.id,
        sourceKind: src.kind,
        sourceTitle: src.title,
        sourcePage: src.page,
        sourceText: `${raw} ${frequency}`,
      })
    );
  }

  const conflicts = detectConflicts(PATIENT_ID, events);
  const reconciliation = summarizeReconciliation(events, conflicts);

  const section = (
    id: string,
    category: DocumentSection['category'],
    title: string,
    content: string,
    sourceDocumentId: string,
    pageRef: string,
    status: DocumentSection['status'] = 'complete',
    flags?: string[]
  ): DocumentSection => ({
    id,
    patientId: PATIENT_ID,
    category,
    title,
    content,
    status,
    sourceDocumentId,
    pageRef,
    flags,
  });

  return {
    patient: {
      id: PATIENT_ID,
      name: 'Margaret Smith',
      mrn: 'HH-22018',
      dob: '1944-03-02',
      admitDate: '2026-09-16',
      attendingPhysician: 'Dr. Elena Vasquez',
      sourceFacility: 'Riverside Hospital → Oak SNF',
      destinationAgency: 'Harbor Home Health',
      journey: [
        { setting: 'Hospital', date: 'Sep 1–4', label: 'AFib, BP med stopped' },
        { setting: 'SNF', date: 'Sep 4–15', label: '40-page packet retyped' },
        { setting: 'Home health', date: 'Sep 16', label: 'First visit tomorrow' },
      ],
    },
    packet: {
      id: 'packet_margaret',
      patientId: PATIENT_ID,
      fileName: 'Margaret_transition_bundle.pdf',
      uploadedAt: new Date(Date.now() - 86400000).toISOString(),
      pageCount: 41,
      status: 'complete',
    },
    sections: [
      section(
        'sec_m_overview',
        'overview',
        'Transition overview',
        'Margaret Smith, 82. Hospital → SNF → home health. Family authorized record pull. First visit tomorrow.\n2 open medication conflicts need a human before start of care.',
        'doc_referral',
        'Referral p.1',
        'human_review_required',
        ['Lisinopril stop vs SNF active', 'Aspirin missing downstream']
      ),
      section(
        'sec_m_dx',
        'diagnoses',
        'Diagnoses',
        '1. Atrial fibrillation (new)\n2. Type 2 diabetes\n3. Hypertension\n4. Hypothyroidism\n5. HFpEF',
        'doc_hospital',
        'pp. 2–3'
      ),
      section(
        'sec_m_meds',
        'medications',
        'Medications',
        '12 medications across 4 sources. 3 changes. 2 unresolved conflicts (lisinopril status, aspirin missing).',
        'doc_hospital',
        'p. 8–14',
        'human_review_required',
        ['Do not pick a winner — show both sources']
      ),
      section(
        'sec_m_all',
        'allergies',
        'Allergies',
        'NKDA on hospital summary. SNF sheet blank.',
        'doc_hospital',
        'p. 6'
      ),
      section('sec_m_labs', 'labs', 'Labs', 'Creatinine 1.3 · HbA1c 7.6% · K 3.4 at SNF', 'doc_labs', 'pp. 19–22'),
      section(
        'sec_m_wound',
        'wound_care',
        'Wound Care',
        'No wounds documented in this transition bundle.',
        'doc_hospital',
        '—'
      ),
      section(
        'sec_m_therapy',
        'therapy',
        'Therapy',
        'PT eval at home. Walks with rolling walker. Fall in hospital (no fracture).',
        'doc_referral',
        'p. 3'
      ),
      section('sec_m_diet', 'diet', 'Diet', 'Cardiac / diabetic diet. No added salt.', 'doc_hospital', 'p. 16'),
      section(
        'sec_m_fu',
        'follow_ups',
        'Follow-ups',
        'Cardiology 10 days. PCP 7 days. INR/BMP after Eliquis start — confirm clinic.',
        'doc_referral',
        'p. 2'
      ),
      section(
        'sec_m_ins',
        'insurance',
        'Insurance/Auth',
        'Medicare + Harbor Home Health SOC pending first-visit recon.',
        'doc_referral',
        'p. 4'
      ),
    ],
    sourceDocuments,
    staffNotes: [
      {
        id: 'note_margaret_1',
        patientId: PATIENT_ID,
        text: 'Daughter Priya authorized record access. Weekly pillbox still has lisinopril.',
        author: 'Intake RN Cole',
        createdAt: new Date(Date.now() - 5400000).toISOString(),
        updatedAt: new Date(Date.now() - 5400000).toISOString(),
      },
    ],
    questions: [],
    answers: [],
    reconciliation,
  };
}
