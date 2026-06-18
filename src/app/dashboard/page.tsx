'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listWorkspaces, searchWorkspaces } from '@/services/patientStore';
import type { PatientWorkspace } from '@/types';
import { StatusBadge } from '@/components/SafetyBanner';

export default function RecordsPage() {
  const [workspaces, setWorkspaces] = useState<PatientWorkspace[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setWorkspaces(query ? searchWorkspaces(query) : listWorkspaces());
  }, [query]);

  const needsReview = workspaces.filter((w) =>
    w.sections.some((s) => s.status === 'needs_review' || s.status === 'human_review_required' || s.status === 'missing')
  );

  return (
    <div>
      <h1 className="page-title">Records</h1>

      <div className="card-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{workspaces.length}</div>
          <div className="stat-label">Records</div>
        </div>
        <div className="card">
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{needsReview.length}</div>
          <div className="stat-label">Flagged</div>
        </div>
        <Link href="/intake" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-value" style={{ color: 'var(--accent)', fontSize: 28 }}>+</div>
          <div className="stat-label">Intake</div>
        </Link>
      </div>

      <input
        className="input"
        type="search"
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 16, maxWidth: 360 }}
        aria-label="Search records"
      />

      {workspaces.length === 0 ? (
        <div className="empty-state card">
          <p>{query ? 'No matches.' : 'No records yet.'}</p>
          {!query && (
            <Link href="/intake" className="btn btn-primary" style={{ marginTop: 12, display: 'inline-flex' }}>
              Intake
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {workspaces.map((ws) => {
            const flags = ws.sections.flatMap((s) => s.flags ?? []);
            const reviewStatus = ws.sections.find(
              (s) => s.status === 'human_review_required' || s.status === 'missing' || s.status === 'needs_review'
            )?.status;

            return (
              <Link key={ws.patient.id} href={`/patients/${ws.patient.id}`} className="patient-row">
                <div style={{ flex: 1 }}>
                  <div className="patient-row-name">{ws.patient.name}</div>
                  <div className="patient-row-meta">{ws.patient.mrn}</div>
                  {flags.length > 0 && (
                    <div className="status-flag" style={{ marginTop: 8 }}>
                      {flags[0]}
                    </div>
                  )}
                </div>
                {reviewStatus && <StatusBadge status={reviewStatus} />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
