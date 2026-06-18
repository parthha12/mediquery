'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getWorkspace } from '@/services/patientStore';
import type { PatientWorkspace, SectionCategory } from '@/types';
import { SECTION_LABELS } from '@/types';
import { StatusBadge } from '@/components/SafetyBanner';

const SECTION_CATEGORIES: SectionCategory[] = [
  'overview',
  'medications',
  'allergies',
  'labs',
  'wound_care',
  'therapy',
  'diet',
  'follow_ups',
];

export default function PatientRecordPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const patientId = params.id as string;
  const sectionKey = (searchParams.get('section') as SectionCategory) || 'overview';

  const [workspace, setWorkspace] = useState<PatientWorkspace | null>(null);

  useEffect(() => {
    setWorkspace(getWorkspace(patientId) ?? null);
  }, [patientId]);

  if (!workspace) {
    return (
      <div className="empty-state card">
        <p>Not found.</p>
        <Link href="/dashboard" className="btn" style={{ marginTop: 12, display: 'inline-flex' }}>
          Records
        </Link>
      </div>
    );
  }

  const activeSection =
    workspace.sections.find((s) => s.category === sectionKey) ??
    workspace.sections.find((s) => s.category === 'overview');

  const sourceDoc = activeSection?.sourceDocumentId
    ? workspace.sourceDocuments.find((d) => d.id === activeSection.sourceDocumentId)
    : undefined;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 4 }}>
        <Link href="/dashboard" style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted)' }}>
          ← Records
        </Link>
        <Link href="/ask" className="btn btn-primary">
          Ask
        </Link>
      </div>

      <h1 className="page-title">{workspace.patient.name}</h1>
      <p className="record-meta">{workspace.patient.mrn}</p>

      <div className="card-grid" style={{ marginBottom: 20 }}>
        {SECTION_CATEGORIES.map((cat) => {
          const section = workspace.sections.find((s) => s.category === cat);
          if (!section) return null;
          return (
            <Link
              key={cat}
              href={`/patients/${patientId}?section=${cat}`}
              className="card"
              style={{
                textDecoration: 'none',
                color: 'inherit',
                borderColor: sectionKey === cat ? 'var(--accent)' : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span className="section-card-title">{SECTION_LABELS[cat]}</span>
                <StatusBadge status={section.status} />
              </div>
            </Link>
          );
        })}
      </div>

      {activeSection && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{activeSection.title}</h2>
            <StatusBadge status={activeSection.status} />
          </div>

          <div className="section-content">{activeSection.content}</div>

          {activeSection.flags?.map((flag) => (
            <div key={flag} className="status-flag">
              {flag}
            </div>
          ))}

          {sourceDoc && (
            <div className="source-ref" style={{ marginTop: 16 }}>
              <div className="source-ref-label">Source · {activeSection.pageRef}</div>
              <div className="source-ref-excerpt">{sourceDoc.rawText}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
