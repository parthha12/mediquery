'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MOCK_PACKET_OPTIONS } from '@/services/mockPatients';
import { ingestAndParse } from '@/services/patientStore';
import type { MockPacketTemplate } from '@/types';

export default function IntakePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<MockPacketTemplate>('complete');
  const [fileName, setFileName] = useState('');
  const [step, setStep] = useState<'select' | 'processing' | 'done'>('select');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const option = MOCK_PACKET_OPTIONS.find((o) =>
        file.name.toLowerCase().includes(o.fileName.split('_')[0].toLowerCase())
      );
      if (option) setSelected(option.template);
    }
  };

  const handleIngest = () => {
    const option = MOCK_PACKET_OPTIONS.find((o) => o.template === selected)!;
    const name = fileName || option.fileName;
    setStep('processing');

    setTimeout(() => {
      const workspace = ingestAndParse(name, selected);
      setStep('done');
      setTimeout(() => router.push(`/patients/${workspace.patient.id}`), 800);
    }, 1200);
  };

  return (
    <div>
      <h1 className="page-title">Intake</h1>

      {step === 'select' && (
        <>
          <label className="upload-zone" htmlFor="packet-upload">
            <div className="upload-zone-title">{fileName || 'Upload PDF'}</div>
            <input
              id="packet-upload"
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </label>

          <div className="mock-packet-list">
            {MOCK_PACKET_OPTIONS.map((option) => (
              <label
                key={option.template}
                className={`mock-packet-option${selected === option.template ? ' selected' : ''}`}
              >
                <input
                  type="radio"
                  name="mock-packet"
                  value={option.template}
                  checked={selected === option.template}
                  onChange={() => {
                    setSelected(option.template);
                    setFileName(option.fileName);
                  }}
                />
                {option.label}
              </label>
            ))}
          </div>

          <button className="btn btn-primary" type="button" onClick={handleIngest} style={{ marginTop: 20 }}>
            Ingest
          </button>
        </>
      )}

      {step === 'processing' && (
        <div className="card empty-state">Organizing…</div>
      )}

      {step === 'done' && (
        <div className="card empty-state" style={{ color: 'var(--success)' }}>Done</div>
      )}
    </div>
  );
}
