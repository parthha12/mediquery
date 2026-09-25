'use client';

import { useState } from 'react';
import type { HumanResolution, PatientWorkspace, ResolutionKind } from '@/types';
import { getEvent } from '@/services/reconciliation';

const ACTIONS: { kind: ResolutionKind; label: string }[] = [
  { kind: 'confirmed_active', label: 'Confirmed active' },
  { kind: 'confirmed_stopped', label: 'Confirmed stopped' },
  { kind: 'needs_provider', label: 'Needs provider' },
  { kind: 'unable_to_determine', label: 'Unable to determine' },
];

export function ConflictReview({
  workspace,
  conflictId,
  onResolve,
  onClose,
}: {
  workspace: PatientWorkspace;
  conflictId: string;
  onResolve: (resolution: HumanResolution) => void;
  onClose: () => void;
}) {
  const recon = workspace.reconciliation;
  const conflict = recon?.conflicts.find((c) => c.id === conflictId);
  const [note, setNote] = useState(conflict?.resolution?.note ?? '');

  if (!recon || !conflict) return null;

  const left = getEvent(recon, conflict.leftEventId);
  const right = getEvent(recon, conflict.rightEventId);

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <div className="mq-kicker" style={{ color: 'var(--warning)' }}>Possible discrepancy</div>
          <h2 style={{ margin: '6px 0 0', fontSize: 22 }}>{conflict.medicationNameNormalized}</h2>
          <p className="record-meta" style={{ margin: '6px 0 0' }}>{conflict.summary}</p>
        </div>
        <button className="btn btn-sm" type="button" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="mq-split" style={{ marginTop: 16 }}>
        {[left, right].map((event, i) =>
          event ? (
            <div key={event.id} className={`mq-evidence ${i === 0 ? 'left' : 'right'}`}>
              <div className="source-ref-label">{event.sourceTitle}</div>
              <div style={{ fontWeight: 800, marginTop: 6 }}>
                {event.action} · {event.dose} {event.unit} {event.frequency}
              </div>
              {event.reason && <div style={{ marginTop: 4 }}>{event.reason}</div>}
              <div className="mq-quote">“{event.sourceText}”</div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>p. {event.sourcePage}</div>
            </div>
          ) : null
        )}
      </div>

      <p style={{ fontSize: 13, color: 'var(--muted)', margin: '16px 0 8px' }}>
        Extracted facts stay as-is. Your mark is the human resolution.
      </p>
      <textarea
        className="textarea"
        placeholder="Optional note for the field nurse"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="mq-filters" style={{ marginTop: 12 }}>
        {ACTIONS.map((action) => (
          <button
            key={action.kind}
            className="btn btn-sm"
            type="button"
            onClick={() =>
              onResolve({
                kind: action.kind,
                note: note.trim() || undefined,
                resolvedAt: new Date().toISOString(),
                resolvedBy: 'Intake RN',
              })
            }
          >
            {action.label}
          </button>
        ))}
      </div>
      {conflict.resolution && (
        <div className="status-flag">
          Marked {conflict.resolution.kind.replaceAll('_', ' ')}
          {conflict.resolution.note ? ` — ${conflict.resolution.note}` : ''}
        </div>
      )}
    </div>
  );
}
