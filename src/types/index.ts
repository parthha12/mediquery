export type SectionCategory =
  | 'overview'
  | 'diagnoses'
  | 'medications'
  | 'allergies'
  | 'labs'
  | 'wound_care'
  | 'therapy'
  | 'diet'
  | 'follow_ups'
  | 'insurance'
  | 'source_documents'
  | 'staff_notes';

export type ReviewStatus = 'complete' | 'needs_review' | 'human_review_required' | 'ai_suggested' | 'missing';

export interface Patient {
  id: string;
  name: string;
  mrn: string;
  dob: string;
  admitDate: string;
  roomNumber?: string;
  attendingPhysician?: string;
}

export interface DischargePacket {
  id: string;
  patientId: string;
  fileName: string;
  uploadedAt: string;
  pageCount: number;
  status: 'pending' | 'processing' | 'complete' | 'error';
}

export interface SourceDocument {
  id: string;
  patientId: string;
  packetId: string;
  title: string;
  pageStart: number;
  pageEnd: number;
  rawText: string;
}

export interface DocumentSection {
  id: string;
  patientId: string;
  category: SectionCategory;
  title: string;
  content: string;
  status: ReviewStatus;
  sourceDocumentId: string;
  pageRef: string;
  flags?: string[];
}

export interface SourceReference {
  id: string;
  sectionId: string;
  documentId: string;
  page: number;
  excerpt: string;
  label: string;
}

export interface StaffNote {
  id: string;
  patientId: string;
  sectionId?: string;
  text: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIQuestion {
  id: string;
  patientId: string;
  text: string;
  askedAt: string;
}

export interface AIAnswer {
  id: string;
  questionId: string;
  text: string;
  references: SourceReference[];
  disclaimer: string;
  answeredAt: string;
}

export interface PatientWorkspace {
  patient: Patient;
  packet: DischargePacket;
  sections: DocumentSection[];
  sourceDocuments: SourceDocument[];
  staffNotes: StaffNote[];
  questions: AIQuestion[];
  answers: AIAnswer[];
}

export interface IngestJob {
  id: string;
  fileName: string;
  status: 'queued' | 'parsing' | 'complete' | 'error';
  patientId?: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export type MockPacketTemplate =
  | 'complete'
  | 'missing_wound_care'
  | 'conflicting_meds'
  | 'missing_therapy'
  | 'incomplete_insurance';

export const SECTION_LABELS: Record<SectionCategory, string> = {
  overview: 'Overview',
  diagnoses: 'Diagnoses',
  medications: 'Medications',
  allergies: 'Allergies',
  labs: 'Labs',
  wound_care: 'Wound Care',
  therapy: 'Therapy',
  diet: 'Diet',
  follow_ups: 'Follow-ups',
  insurance: 'Insurance/Auth',
  source_documents: 'Documents',
  staff_notes: 'Staff Notes',
};
