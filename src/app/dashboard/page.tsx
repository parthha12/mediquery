'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { listWorkspaces, resetToMockData, searchWorkspaces } from '@/services/patientStore';
import type { PatientWorkspace } from '@/types';

type Filter = 'all' | 'review' | 'ready';

function caseTone(ws: PatientWorkspace): 'hot' | 'ready' | 'mid' {
  const open = ws.reconciliation?.summary.unresolved ?? 0;
  if (open > 0) return 'hot';
  const flagged = ws.sections.some((s) => s.status !== 'complete');
  return flagged ? 'mid' : 'ready';
}

export default function BoardPage() {
  const [workspaces, setWorkspaces] = useState<PatientWorkspace[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const reload = () => setWorkspaces(query ? searchWorkspaces(query) : listWorkspaces());

  useEffect(() => {
    reload();
  }, [query]);

  const filtered = useMemo(() => {
    return workspaces.filter((ws) => {
      const tone = caseTone(ws);
      if (filter === 'review') return tone !== 'ready';
      if (filter === 'ready') return tone === 'ready';
      return true;
    });
  }, [workspaces, filter]);

  const openConflicts = workspaces.reduce((n, ws) => n + (ws.reconciliation?.summary.unresolved ?? 0), 0);
  const needsReview = workspaces.filter((ws) => caseTone(ws) !== 'ready').length;

  return (
    <div>
      <div className="page-head">
        <div className="page-head-copy">
          <div className="mq-kicker">Harbor Home Health</div>
          <h1 className="page-title" style={{ marginBottom: 6 }}>Intake board</h1>
          <p className="record-meta">Before the first visit — conflicts stay open until a human marks them.</p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-sm"
            type="button"
            onClick={() => {
              resetToMockData();
              setQuery('');
              setWorkspaces(listWorkspaces());
            }}
          >
            Reset demo
          </button>
          <Link href="/intake" className="btn btn-primary btn-sm">
            New case
          </Link>
        </div>
      </div>

      <div className="mq-stats">
        <div className="mq-stat">
          <b>{workspaces.length}</b>
          <div className="stat-label">Cases</div>
        </div>
        <div className="mq-stat">
          <b style={{ color: 'var(--warning)' }}>{openConflicts}</b>
          <div className="stat-label">Open conflicts</div>
        </div>
        <div className="mq-stat">
          <b>{needsReview}</b>
          <div className="stat-label">Need review</div>
        </div>
        <div className="mq-stat">
          <b>{workspaces.length - needsReview}</b>
          <div className="stat-label">Ready</div>
        </div>
      </div>

      <div className="mq-filters">
        {(['all', 'review', 'ready'] as Filter[]).map((key) => (
          <button key={key} className={`mq-tab${filter === key ? ' on' : ''}`} type="button" onClick={() => setFilter(key)}>
            {key === 'all' ? 'All cases' : key === 'review' ? 'Needs review' : 'Ready'}
          </button>
        ))}
      </div>

      <input
        className="input"
        type="search"
        placeholder="Search name, MRN, or medication…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 16, maxWidth: 420 }}
        aria-label="Search cases"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((ws) => {
          const recon = ws.reconciliation;
          const tone = caseTone(ws);
          return (
            <Link
              key={ws.patient.id}
              href={`/patients/${ws.patient.id}`}
              className={`mq-case${tone === 'hot' ? ' hot' : ''}`}
            >
              <div>
                <div className="mq-case-name">{ws.patient.name}</div>
                <div className="mq-case-meta">
                  {ws.patient.mrn}
                  {ws.patient.sourceFacility ? ` · ${ws.patient.sourceFacility}` : ''}
                  {ws.patient.destinationAgency ? ` → ${ws.patient.destinationAgency}` : ''}
                </div>
                <div className="mq-pills">
                  {recon && (
                    <span className="mq-pill">
                      {recon.summary.total} meds
                    </span>
                  )}
                  {recon && recon.summary.unresolved > 0 && (
                    <span className="mq-pill danger">{recon.summary.unresolved} conflicts</span>
                  )}
                  {recon && recon.summary.changes > 0 && (
                    <span className="mq-pill warn">{recon.summary.changes} changes</span>
                  )}
                  {tone === 'ready' && <span className="mq-pill ok">Reconciled</span>}
                </div>
              </div>
              <span className="btn btn-sm">Open</span>
            </Link>
          );
        })}
        {filtered.length === 0 && <div className="empty-state card">No cases in this filter.</div>}
      </div>
    </div>
  );
}
