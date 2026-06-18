import type { DocumentSection, PatientWorkspace, SectionCategory, SourceReference } from '@/types';

const SECTION_LABELS: Record<SectionCategory, string> = {
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

const DISCLAIMER = 'Not medical advice.';

export function formatSectionBlock(section: DocumentSection): string {
  const flags = section.flags?.length ? ` [FLAGS: ${section.flags.join('; ')}]` : '';
  const status = section.status !== 'complete' ? ` [STATUS: ${section.status}]` : '';
  return `[section_id=${section.id} | ${SECTION_LABELS[section.category]} | ${section.pageRef}${status}${flags}]
${section.title}
${section.content}`;
}

export function buildPatientRagContext(workspace: PatientWorkspace): string {
  const { patient, packet, sections, sourceDocuments, staffNotes } = workspace;

  const sectionBlocks = sections.map(formatSectionBlock).join('\n\n');
  const docSummaries = sourceDocuments
    .map((d) => `[document_id=${d.id} | ${d.title} | pages ${d.pageStart}-${d.pageEnd}]`)
    .join('\n');
  const notesBlock =
    staffNotes.length > 0
      ? staffNotes.map((n) => `[staff_note] ${n.author}: ${n.text}`).join('\n')
      : 'No staff notes.';

  return `PATIENT: ${patient.name} (MRN: ${patient.mrn}, DOB: ${patient.dob})
ADMITTED: ${patient.admitDate}${patient.roomNumber ? ` | Room ${patient.roomNumber}` : ''}
ATTENDING: ${patient.attendingPhysician ?? 'Not listed'}
DISCHARGE PACKET: ${packet.fileName} (${packet.pageCount} pages, uploaded ${packet.uploadedAt})

SOURCE DOCUMENTS:
${docSummaries}

CLINICAL SECTIONS:
${sectionBlocks}

STAFF NOTES:
${notesBlock}`;
}

export function buildIngestRagContext(workspaces: PatientWorkspace[]): string {
  if (workspaces.length === 0) {
    return 'No patient workspaces have been ingested yet.';
  }

  const summaries = workspaces.map((ws) => {
    const reviewFlags = ws.sections.filter(
      (s) => s.status !== 'complete' || (s.flags?.length ?? 0) > 0
    );
    const flagSummary =
      reviewFlags.length > 0
        ? reviewFlags
            .map((s) => `${SECTION_LABELS[s.category]}: ${s.status}${s.flags?.length ? ` (${s.flags.join('; ')})` : ''}`)
            .join('; ')
        : 'All sections complete';

    return `--- WORKSPACE: ${ws.patient.name} (patient_id=${ws.patient.id}, MRN=${ws.patient.mrn}) ---
Packet: ${ws.packet.fileName} | ${ws.packet.pageCount} pages | Status: ${ws.packet.status}
Sections: ${ws.sections.length} | Staff notes: ${ws.staffNotes.length}
Review status: ${flagSummary}
${buildPatientRagContext(ws)}`;
  });

  return `INGEST DATABASE — ${workspaces.length} patient workspace(s)

${summaries.join('\n\n')}`;
}

export function resolveReferences(
  workspace: PatientWorkspace,
  sectionIds: string[]
): SourceReference[] {
  const uniqueIds = [...new Set(sectionIds)];
  const references: SourceReference[] = [];

  for (const sectionId of uniqueIds) {
    const section = workspace.sections.find((s) => s.id === sectionId);
    if (!section) continue;

    const doc = workspace.sourceDocuments.find((d) => d.id === section.sourceDocumentId);
    if (!doc) continue;

    references.push({
      id: `ref_${sectionId}`,
      sectionId: section.id,
      documentId: doc.id,
      page: doc.pageStart,
      excerpt: section.content.split('\n')[0].slice(0, 200),
      label: `Source Linked — ${doc.title}, ${section.pageRef}`,
    });
  }

  return references;
}

export function resolveIngestReferences(
  workspaces: PatientWorkspace[],
  citations: { patientId: string; sectionId: string }[]
): SourceReference[] {
  const references: SourceReference[] = [];

  for (const { patientId, sectionId } of citations) {
    const workspace = workspaces.find((w) => w.patient.id === patientId);
    if (!workspace) continue;

    const section = workspace.sections.find((s) => s.id === sectionId);
    if (!section) continue;

    const doc = workspace.sourceDocuments.find((d) => d.id === section.sourceDocumentId);
    if (!doc) continue;

    references.push({
      id: `ref_${patientId}_${sectionId}`,
      sectionId: section.id,
      documentId: doc.id,
      page: doc.pageStart,
      excerpt: section.content.split('\n')[0].slice(0, 200),
      label: `${workspace.patient.name} — ${doc.title}, ${section.pageRef}`,
    });
  }

  return references;
}

export { DISCLAIMER };
