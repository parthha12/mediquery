'use client';

import { DataExplorerChat } from '@/components/DataExplorerChat';

export default function AskPage() {
  return (
    <div>
      <h1 className="page-title">Ask</h1>
      <p className="record-meta" style={{ marginTop: -8, marginBottom: 16 }}>
        Grounded in ingested packets only. Citations required.
      </p>
      <DataExplorerChat />
    </div>
  );
}
