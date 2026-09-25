import type { Reconciliation } from '@/types';

export function MedTimeline({ recon }: { recon: Reconciliation }) {
  const names = [...new Set(recon.events.map((e) => e.medicationNameNormalized))];

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {names.map((name) => {
        const events = recon.events
          .filter((e) => e.medicationNameNormalized === name)
          .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
        const conflict = recon.conflicts.find((c) => c.medicationNameNormalized === name);
        return (
          <div key={name} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <h3 style={{ margin: 0, textTransform: 'capitalize' }}>{name}</h3>
              {conflict && <span className="mq-pill warn">{conflict.kind}</span>}
            </div>
            <div className="mq-timeline" style={{ marginTop: 14 }}>
              {events.map((event) => (
                <div key={event.id} className={`mq-tl-item${event.action === 'STOP' || conflict ? ' alert' : ''}`}>
                  <strong>
                    {event.eventDate} — {event.sourceTitle}
                  </strong>
                  <div>
                    {event.action} · {event.dose} {event.unit} {event.frequency}
                    {event.reason ? ` · ${event.reason}` : ''}
                  </div>
                  <div className="mq-quote">“{event.sourceText}”</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
