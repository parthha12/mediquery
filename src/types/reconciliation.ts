export type MedicationAction = 'START' | 'STOP' | 'CONTINUE' | 'CHANGE' | 'UNKNOWN';

export type SourceKind = 'hospital' | 'snf' | 'pharmacy' | 'referral' | 'upload';

export type ConflictKind = 'status' | 'dose' | 'frequency' | 'missing' | 'duplicate' | 'unclear' | 'allergy';

export type ResolutionKind =
  | 'confirmed_active'
  | 'confirmed_stopped'
  | 'needs_provider'
  | 'unable_to_determine';

export type ReconMedStatus = 'active' | 'stopped' | 'unknown' | 'changed';

export interface MedicationEvent {
  id: string;
  patientId: string;
  medicationNameRaw: string;
  medicationNameNormalized: string;
  dose?: string;
  unit?: string;
  route?: string;
  frequency?: string;
  action: MedicationAction;
  eventDate: string;
  reason?: string;
  prescriber?: string;
  sourceDocumentId: string;
  sourceKind: SourceKind;
  sourceTitle: string;
  sourcePage: number;
  sourceText: string;
  extractionConfidence: number;
}

export interface HumanResolution {
  kind: ResolutionKind;
  note?: string;
  resolvedAt: string;
  resolvedBy: string;
}

export interface MedicationConflict {
  id: string;
  patientId: string;
  medicationNameNormalized: string;
  kind: ConflictKind;
  leftEventId: string;
  rightEventId: string;
  summary: string;
  resolution?: HumanResolution;
}

export interface ReconciledMedication {
  id: string;
  name: string;
  currentStatus: ReconMedStatus;
  issue?: string;
  sourceCount: number;
  eventIds: string[];
  conflictId?: string;
}

export interface ReconciliationSummary {
  total: number;
  reconciled: number;
  conflicts: number;
  unresolved: number;
  changes: number;
}

export interface Reconciliation {
  events: MedicationEvent[];
  conflicts: MedicationConflict[];
  medications: ReconciledMedication[];
  summary: ReconciliationSummary;
}

export interface PatientJourneyStop {
  setting: string;
  date: string;
  label: string;
}
