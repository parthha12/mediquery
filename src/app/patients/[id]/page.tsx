'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getWorkspace, resolveMedicationConflict } from '@/services/patientStore';
import type { HumanResolution, PatientWorkspace, SectionCategory } from '@/types';
import { SECTION_LABELS } from '@/types';
import { StatusBadge } from '@/components/SafetyBanner';
import { MedTable } from '@/components/MedTable';
import { MedTimeline } from '@/components/MedTimeline';
import { ConflictReview } from '@/components/ConflictReview';

type Tab = 'reconcile' | 'timeline' | 'record';

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
  const requested = (searchParams.get('tab') as Tab) || 'reconcile';

  const [workspace, setWorkspace] = useState<PatientWorkspace | null>(null);
  const [tab, setTab] = useState<Tab>(requested);
  const [conflictId, setConflictId] = useState<string | undefined>();

  useEffect(() => {
    const ws = getWorkspace(patientId) ?? null;
    setWorkspace(ws);
    const firstOpen = ws?.reconciliation?.conflicts.find((c) => !c.resolution)?.id;
    setConflictId(firstOpen);
  }, [patientId]);

  if (!workspace) {
    return (
      <div className="empty-state card">
        <p>Not found.</p>
        <Link href="/dashboard" className="btn" style={{ marginTop: 12, display: 'inline-flex' }}>
          Board
        </Link>
      </div>
    );
  }

  const recon = workspace.reconciliation;
  const sectionKey = (searchParams.get('section') as SectionCategory) || 'overview';
  const activeSection =
    workspace.sections.find((s) => s.category === sectionKey) ??
    workspace.sections.find((s) => s.category === 'overview');
  const sourceDoc = activeSection?.sourceDocumentId
    ? workspace.sourceDocuments.find((d) => d.id === activeSection.sourceDocumentId)
    : undefined;

  const handleResolve = (resolution: HumanResolution) => {
    if (!conflictId) return;
    const next = resolveMedicationConflict(patientId, conflictId, resolution);
    if (next) setWorkspace(next);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <Link href="/dashboard" style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted)' }}>
          ← Board
        </Link>
        <Link href="/ask" className="btn btn-primary btn-sm">
          Ask
        </Link>
      </div>

      <div className="mq-kicker" style={{ marginTop: 12 }}>
        {workspace.patient.destinationAgency ?? 'Intake case'}
      </div>
      <h1 className="page-title" style={{ marginBottom: 6 }}>{workspace.patient.name}</h1>
      <p className="record-meta">
        {workspace.patient.mrn}
        {workspace.patient.sourceFacility ? ` · ${workspace.patient.sourceFacility}` : ''}
        {workspace.patient.journey ? ` · ${workspace.patient.journey.map((s) => s.setting).join(' → ')}` : ''}
      </p>

      {recon && (
        <div className="mq-stats">
          <div className="mq-stat">
            <b>{recon.summary.total}</b>
            <div className="stat-label">Medications</div>
          </div>
          <div className="mq-stat">
            <b>{recon.summary.changes}</b>
            <div className="stat-label">Changes</div>
          </div>
          <div className="mq-stat">
            <b style={{ color: 'var(--warning)' }}>{recon.summary.unresolved}</b>
            <div className="stat-label">Open conflicts</div>
          </div>
          <div className="mq-stat">
            <b>{workspace.sourceDocuments.length}</b>
            <div className="stat-label">Sources</div>
          </div>
        </div>
      )}

      <div className="mq-tabs">
        {(['reconcile', 'timeline', 'record'] as Tab[]).map((key) => (
          <button key={key} className={`mq-tab${tab === key ? ' on' : ''}`} type="button" onClick={() => setTab(key)}>
            {key === 'reconcile' ? 'Reconcile' : key === 'timeline' ? 'Timeline' : 'Full record'}
          </button>
        ))}
      </div>

      {tab === 'reconcile' && recon && (
        <>
          <MedTable recon={recon} selectedId={conflictId} onSelect={setConflictId} />
          {conflictId && (
            <ConflictReview
              workspace={workspace}
              conflictId={conflictId}
              onResolve={handleResolve}
              onClose={() => setConflictId(undefined)}
            />
          )}
        </>
      )}

      {tab === 'timeline' && recon && <MedTimeline recon={recon} />}

      {tab === 'record' && (
        <>
          <div className="card-grid" style={{ marginBottom: 20 }}>
            {SECTION_CATEGORIES.map((cat) => {
              const section = workspace.sections.find((s) => s.category === cat);
              if (!section) return null;
              return (
                <Link
                  key={cat}
                  href={`/patients/${patientId}?section=${cat}`}
                  onClick={() => setTab('record')}
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
                <div key={flag} className="status-flag">{flag}</div>
              ))}
              {sourceDoc && (
                <div className="source-ref" style={{ marginTop: 16 }}>
                  <div className="source-ref-label">Source · {activeSection.pageRef}</div>
                  <div className="source-ref-excerpt">{sourceDoc.rawText}</div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
