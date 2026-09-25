import type { Reconciliation } from '@/types';

export function MedTable({
  recon,
  selectedId,
  onSelect,
}: {
  recon: Reconciliation;
  selectedId?: string;
  onSelect: (conflictId?: string) => void;
}) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'auto' }}>
      <table className="mq-table">
        <thead>
          <tr>
            <th>Medication</th>
            <th>Status</th>
            <th>Issue</th>
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {recon.medications.map((med) => (
            <tr
              key={med.id}
              className={`${med.issue ? 'issue' : ''} ${med.conflictId ? 'clickable' : ''}`}
              style={selectedId === med.conflictId ? { outline: '2px solid #e89c5c' } : undefined}
              onClick={() => onSelect(med.conflictId)}
            >
              <td style={{ fontWeight: 800 }}>{med.name}</td>
              <td style={{ textTransform: 'capitalize' }}>{med.currentStatus}</td>
              <td>{med.issue ?? '—'}</td>
              <td>{med.sourceCount} source{med.sourceCount === 1 ? '' : 's'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
