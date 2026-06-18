'use client';

import { useEffect, useState } from 'react';
import type { PatientWorkspace } from '@/types';
import { listWorkspaces } from '@/services/patientStore';
import { SourceReferenceCard } from './SafetyBanner';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  references?: { label: string; excerpt: string; page: number }[];
  disclaimer?: string;
}

export function DataExplorerChat() {
  const [workspaces, setWorkspaces] = useState<PatientWorkspace[]>([]);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [llmEnabled, setLlmEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWorkspaces(listWorkspaces());
    fetch('/api/chat')
      .then((r) => r.json())
      .then((data: { llmEnabled: boolean }) => setLlmEnabled(data.llmEnabled))
      .catch(() => setLlmEnabled(false));
  }, []);

  const handleAsk = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'ingest',
          question: text,
          workspaces,
        }),
      });

      const data = (await res.json()) as {
        text?: string;
        references?: { label: string; excerpt: string; page: number }[];
        disclaimer?: string;
        error?: string;
        llmEnabled?: boolean;
      };

      if (!res.ok) throw new Error(data.error ?? 'Failed to get answer');
      if (data.llmEnabled !== undefined) setLlmEnabled(data.llmEnabled);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.text ?? '',
          references: data.references,
          disclaimer: data.disclaimer,
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Couldn't answer: ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = ['Who needs review?', 'Any allergy conflicts?'];

  return (
    <div className="chat-panel card">
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {llmEnabled !== null && (
          <span className={`llm-status ${llmEnabled ? 'llm-status-live' : 'llm-status-fallback'}`}>
            {llmEnabled ? 'LLM' : 'Fallback'}
          </span>
        )}
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            {workspaces.length} record{workspaces.length !== 1 ? 's' : ''} ready
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i}>
            <div className={`chat-bubble chat-bubble-${msg.role === 'user' ? 'user' : 'ai'}`}>
              {msg.text}
              {msg.disclaimer && <div className="chat-disclaimer">{msg.disclaimer}</div>}
            </div>
            {msg.references?.map((ref, j) => (
              <SourceReferenceCard key={j} {...ref} />
            ))}
          </div>
        ))}
        {loading && (
          <div className="chat-bubble chat-bubble-ai" style={{ opacity: 0.7 }}>
            …
          </div>
        )}
      </div>

      {error && (
        <p style={{ color: 'var(--danger)', fontSize: 14, fontWeight: 700, margin: 0 }}>{error}</p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {suggestions.map((s) => (
          <button key={s} className="btn btn-sm" type="button" onClick={() => setInput(s)}>
            {s}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="input"
          placeholder="Ask anything…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          aria-label="Question"
          disabled={loading}
        />
        <button className="btn btn-primary" type="button" onClick={handleAsk} disabled={loading}>
          Ask
        </button>
      </div>
    </div>
  );
}
