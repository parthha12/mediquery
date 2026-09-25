import type {
  HumanResolution,
  MedicationAction,
  MedicationConflict,
  MedicationEvent,
  PatientWorkspace,
  ReconMedStatus,
  Reconciliation,
  ReconciledMedication,
  SourceKind,
} from '@/types';

const ACTIVE_ACTIONS: MedicationAction[] = ['START', 'CONTINUE', 'CHANGE'];

export function normalizeMedName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(tablet|tab|capsule|cap|oral|po|mg|mcg|units?|iu)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectConflicts(patientId: string, events: MedicationEvent[]): MedicationConflict[] {
  const byName = new Map<string, MedicationEvent[]>();
  for (const event of events) {
    const key = event.medicationNameNormalized;
    byName.set(key, [...(byName.get(key) ?? []), event]);
  }

  const conflicts: MedicationConflict[] = [];

  for (const [name, group] of byName) {
    if (group.length < 2) continue;
    const stopped = group.find((e) => e.action === 'STOP');
    const active = group.find((e) => ACTIVE_ACTIONS.includes(e.action));
    if (stopped && active) {
      conflicts.push({
        id: `conflict_${patientId}_${name}_status`,
        patientId,
        medicationNameNormalized: name,
        kind: 'status',
        leftEventId: stopped.id,
        rightEventId: active.id,
        summary: `${stopped.sourceTitle}: STOP · ${active.sourceTitle}: ${active.action}`,
      });
      continue;
    }

    const doses = [...new Set(group.map((e) => [e.dose, e.unit].filter(Boolean).join(' ')).filter(Boolean))];
    if (doses.length > 1) {
      conflicts.push({
        id: `conflict_${patientId}_${name}_dose`,
        patientId,
        medicationNameNormalized: name,
        kind: 'dose',
        leftEventId: group[0].id,
        rightEventId: group[1].id,
        summary: `Dose differs: ${doses.join(' vs ')}`,
      });
    }
  }

  const laterKinds = new Set(events.filter((e) => e.sourceKind !== 'hospital').map((e) => e.sourceKind));
  if (laterKinds.size > 0) {
    const hospitalNames = new Set(
      events.filter((e) => e.sourceKind === 'hospital' && e.action !== 'STOP').map((e) => e.medicationNameNormalized)
    );
    const laterNames = new Set(
      events.filter((e) => e.sourceKind !== 'hospital').map((e) => e.medicationNameNormalized)
    );
    for (const name of hospitalNames) {
      if (laterNames.has(name)) continue;
      if (conflicts.some((c) => c.medicationNameNormalized === name)) continue;
      const hospital = events.find((e) => e.medicationNameNormalized === name && e.sourceKind === 'hospital');
      const later = events.find((e) => laterKinds.has(e.sourceKind));
      if (!hospital || !later) continue;
      conflicts.push({
        id: `conflict_${patientId}_${name}_missing`,
        patientId,
        medicationNameNormalized: name,
        kind: 'missing',
        leftEventId: hospital.id,
        rightEventId: later.id,
        summary: `${hospital.sourceTitle}: present · missing downstream`,
      });
    }
  }

  return conflicts;
}

export function buildReconciledMedications(
  events: MedicationEvent[],
  conflicts: MedicationConflict[]
): ReconciledMedication[] {
  const byName = new Map<string, MedicationEvent[]>();
  for (const event of events) {
    byName.set(event.medicationNameNormalized, [...(byName.get(event.medicationNameNormalized) ?? []), event]);
  }

  return [...byName.entries()].map(([name, group]) => {
    const conflict = conflicts.find((c) => c.medicationNameNormalized === name);
    const latest = [...group].sort((a, b) => a.eventDate.localeCompare(b.eventDate)).at(-1);
    const hasChange = group.some((e) => e.action === 'CHANGE' || e.action === 'START');
    let currentStatus: ReconMedStatus = 'active';
    if (conflict && !conflict.resolution) currentStatus = 'unknown';
    else if (latest?.action === 'STOP') currentStatus = 'stopped';
    else if (hasChange) currentStatus = 'changed';

    const display = group[0].medicationNameRaw.split(/\s+\d/)[0] || group[0].medicationNameRaw;

    return {
      id: `med_${name}`,
      name: display,
      currentStatus,
      issue: conflict && !conflict.resolution ? conflict.summary : undefined,
      sourceCount: new Set(group.map((e) => e.sourceDocumentId)).size,
      eventIds: group.map((e) => e.id),
      conflictId: conflict?.id,
    };
  });
}

export function summarizeReconciliation(events: MedicationEvent[], conflicts: MedicationConflict[]): Reconciliation {
  const medications = buildReconciledMedications(events, conflicts);
  const unresolved = conflicts.filter((c) => !c.resolution).length;
  const changeNames = new Set(
    events.filter((e) => e.action === 'CHANGE' || e.action === 'START').map((e) => e.medicationNameNormalized)
  );

  return {
    events,
    conflicts,
    medications,
    summary: {
      total: medications.length,
      reconciled: medications.filter((m) => !m.issue).length,
      conflicts: conflicts.length,
      unresolved,
      changes: changeNames.size,
    },
  };
}

export function resolveConflict(
  workspace: PatientWorkspace,
  conflictId: string,
  resolution: HumanResolution
): PatientWorkspace {
  const recon = workspace.reconciliation;
  if (!recon) return workspace;

  const conflicts = recon.conflicts.map((conflict) =>
    conflict.id === conflictId ? { ...conflict, resolution } : conflict
  );
  const next = summarizeReconciliation(recon.events, conflicts);
  return { ...workspace, reconciliation: next };
}

const MED_LINE = /^[•\-*]\s*(.+?)\s+(\d+(?:\.\d+)?)\s*(mg|mcg|units?|iu|puffs?)?\s*(.*)$/i;

export function parseMedicationLine(
  patientId: string,
  line: string,
  source: {
    documentId: string;
    kind: SourceKind;
    title: string;
    page: number;
    date: string;
  }
): MedicationEvent | null {
  const cleaned = line.replace(/^[•\-*]\s*/, '').trim();
  if (!cleaned) return null;
  const match = line.match(MED_LINE);
  const rawName = match ? match[1].trim() : cleaned.split(/\s+\d/)[0] ?? cleaned;
  const rest = match ? match[4] ?? '' : cleaned;
  const action: MedicationAction = /stop|discontinu/i.test(rest) ? 'STOP' : 'CONTINUE';

  return {
    id: `evt_${patientId}_${normalizeMedName(rawName) || 'med'}_${source.documentId}`,
    patientId,
    medicationNameRaw: cleaned,
    medicationNameNormalized: normalizeMedName(rawName) || normalizeMedName(cleaned),
    dose: match?.[2],
    unit: match?.[3],
    route: /\bPO\b/i.test(cleaned) ? 'PO' : undefined,
    frequency: /daily|bid|tid|qid|prn|nightly|q\d/i.exec(cleaned)?.[0],
    action,
    eventDate: source.date,
    sourceDocumentId: source.documentId,
    sourceKind: source.kind,
    sourceTitle: source.title,
    sourcePage: source.page,
    sourceText: cleaned,
    extractionConfidence: 0.72,
  };
}

export function deriveReconciliation(workspace: PatientWorkspace): Reconciliation {
  const medSection = workspace.sections.find((s) => s.category === 'medications');
  const doc = workspace.sourceDocuments.find((d) => d.id === medSection?.sourceDocumentId);
  const lines = (medSection?.content ?? '').split('\n').filter((line) => line.trim());
  const events = lines
    .map((line) =>
      parseMedicationLine(workspace.patient.id, line, {
        documentId: doc?.id ?? 'upload',
        kind: 'upload',
        title: doc?.title ?? 'Discharge packet',
        page: doc?.pageStart ?? 1,
        date: workspace.patient.admitDate,
      })
    )
    .filter((event): event is MedicationEvent => Boolean(event));

  let conflicts = detectConflicts(workspace.patient.id, events);
  const allergyFlag = workspace.sections.find((s) => s.category === 'allergies')?.flags?.[0];
  const amox = events.find((e) => e.medicationNameNormalized.includes('amoxicillin'));
  if (allergyFlag && amox) {
    conflicts = [
      ...conflicts,
      {
        id: `conflict_${workspace.patient.id}_amoxicillin_allergy`,
        patientId: workspace.patient.id,
        medicationNameNormalized: amox.medicationNameNormalized,
        kind: 'allergy',
        leftEventId: amox.id,
        rightEventId: amox.id,
        summary: allergyFlag,
      },
    ];
  }

  return summarizeReconciliation(events, conflicts);
}

export function ensureReconciliation(workspace: PatientWorkspace): PatientWorkspace {
  if (workspace.reconciliation) return workspace;
  return { ...workspace, reconciliation: deriveReconciliation(workspace) };
}

export function getEvent(recon: Reconciliation, eventId: string): MedicationEvent | undefined {
  return recon.events.find((e) => e.id === eventId);
}
