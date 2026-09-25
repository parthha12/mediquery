import Link from 'next/link';

export default function Home() {
  return (
    <div>
      <section className="mq-hero">
        <div className="mq-kicker">Home-health intake</div>
        <h1>The record follows the patient.</h1>
        <p>
          Hospital, SNF, pharmacy, and paper lists disagree. MediQuery turns them into a
          source-traced medication story — then a nurse decides.
        </p>
        <div className="mq-hero-actions">
          <Link href="/patients/patient_margaret" className="btn btn-primary">
            Open Margaret&apos;s case
          </Link>
          <Link href="/dashboard" className="btn btn-ghost">
            Agency board
          </Link>
        </div>
        <div className="mq-journey">
          <div className="mq-stop">
            <strong>Hospital · Sep 4</strong>
            <span>Eliquis started. Lisinopril stopped for hypotension.</span>
          </div>
          <div className="mq-stop">
            <strong>SNF · Sep 12</strong>
            <span>40-page packet retyped. The stop reason disappears.</span>
          </div>
          <div className="mq-stop">
            <strong>Home · first visit</strong>
            <span>12 meds · 3 changes · 2 conflicts. You resolve them.</span>
          </div>
        </div>
      </section>

      <div className="mq-stats">
        <div className="mq-stat">
          <b>12</b>
          <div className="stat-label">Medications</div>
        </div>
        <div className="mq-stat">
          <b style={{ color: 'var(--warning)' }}>2</b>
          <div className="stat-label">Open conflicts</div>
        </div>
        <div className="mq-stat">
          <b>4</b>
          <div className="stat-label">Sources</div>
        </div>
        <div className="mq-stat">
          <b>0</b>
          <div className="stat-label">Autonomous calls</div>
        </div>
      </div>
    </div>
  );
}
