import type { ReviewStatus } from '@/types';

export function SafetyBanner() {
  return (
    <div className="safety-banner" role="status" aria-label="Safety notice">
      Prototype · Human review required
    </div>
  );
}

export function StatusBadge({ status }: { status: ReviewStatus }) {
  const labels: Record<ReviewStatus, string> = {
    complete: 'OK',
    needs_review: 'Review',
    human_review_required: 'Review',
    ai_suggested: 'AI',
    missing: 'Missing',
  };

  return <span className={`badge badge-${status}`}>{labels[status]}</span>;
}

export function SourceReferenceCard({
  label,
  excerpt,
  page,
}: {
  label: string;
  excerpt: string;
  page: number;
}) {
  return (
    <div className="source-ref">
      <div className="source-ref-label">Source · p. {page}</div>
      <div>{label}</div>
      {excerpt && <div className="source-ref-excerpt">{excerpt}</div>}
    </div>
  );
}
