'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { MOCK_PACKET_OPTIONS } from '@/services/mockPatients';
import { ingestAndParse, ingestWorkspace } from '@/services/patientStore';
import type { MockPacketTemplate, PatientWorkspace } from '@/types';

export default function IntakePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<MockPacketTemplate>('complete');
  const [fileName, setFileName] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [step, setStep] = useState<'select' | 'processing' | 'done' | 'error'>('select');
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setFileName(file.name);
      setError('');
      const option = MOCK_PACKET_OPTIONS.find((o) =>
        file.name.toLowerCase().includes(o.fileName.split('_')[0].toLowerCase())
      );
      if (option) setSelected(option.template);
    }
  };

  const handleIngest = async () => {
    setStep('processing');
    setError('');

    try {
      let workspace: PatientWorkspace;

      if (uploadedFile) {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        const response = await fetch('/api/intake', { method: 'POST', body: formData });
        const payload = (await response.json()) as { workspace?: PatientWorkspace; error?: string };

        if (!response.ok || !payload.workspace) {
          throw new Error(payload.error ?? 'Failed to extract discharge packet');
        }

        workspace = ingestWorkspace(payload.workspace);
      } else {
        const option = MOCK_PACKET_OPTIONS.find((o) => o.template === selected)!;
        const name = fileName || option.fileName;
        workspace = ingestAndParse(name, selected);
      }

      setStep('done');
      setTimeout(() => router.push(`/patients/${workspace.patient.id}`), 800);
    } catch (err) {
      setStep('error');
      setError(err instanceof Error ? err.message : 'Ingest failed');
    }
  };

  return (
    <div>
      <h1 className="page-title">Intake</h1>

      {step === 'select' && (
        <>
          <label className="upload-zone" htmlFor="packet-upload">
            <div className="upload-zone-title">{fileName || 'Upload PDF'}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
              {uploadedFile ? 'PDF will be parsed and loaded via ETL' : 'Upload extracts SNF fields from your PDF'}
            </div>
            <input
              id="packet-upload"
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </label>

          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '16px 0 8px' }}>
            Or use a demo template without uploading:
          </p>

          <div className="mock-packet-list">
            {MOCK_PACKET_OPTIONS.map((option) => (
              <label
                key={option.template}
                className={`mock-packet-option${selected === option.template && !uploadedFile ? ' selected' : ''}`}
              >
                <input
                  type="radio"
                  name="mock-packet"
                  value={option.template}
                  checked={selected === option.template && !uploadedFile}
                  onChange={() => {
                    setSelected(option.template);
                    setFileName(option.fileName);
                    setUploadedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                />
                {option.label}
              </label>
            ))}
          </div>

          <button className="btn btn-primary" type="button" onClick={handleIngest} style={{ marginTop: 20 }}>
            {uploadedFile ? 'Extract & Ingest' : 'Ingest demo'}
          </button>
        </>
      )}

      {step === 'processing' && (
        <div className="card empty-state">Extracting text and organizing SNF fields…</div>
      )}

      {step === 'done' && (
        <div className="card empty-state" style={{ color: 'var(--success)' }}>Done</div>
      )}

      {step === 'error' && (
        <div className="card empty-state">
          <p style={{ color: 'var(--danger)', marginBottom: 12 }}>{error}</p>
          <button className="btn" type="button" onClick={() => setStep('select')}>Try again</button>
        </div>
      )}
    </div>
  );
}
