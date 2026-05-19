import React, { useState } from 'react';
import axios from 'axios';
import { API } from '../../context/AuthContext';

// NON-VIZ: generates a lesson summary "PDF" (text payload + base64). Lets the
// user download the produced summary file.
export default function LessonSummaryPdf() {
  const [topic, setTopic] = useState('Fractions Review');
  const [sessionId, setSessionId] = useState('1');
  const [notes, setNotes] = useState('Focus on equivalent fractions; revisit common denominators.');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const generate = async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await axios.post(`${API}/api/custom-views/lesson-summary-pdf`, {
        session_id: sessionId,
        topic,
        notes,
      });
      setResult(res.data);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!result?.base64) return;
    const blob = new Blob([atob(result.base64)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename || 'lesson-summary.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
      <h3 style={{ margin: 0, marginBottom: 8 }}>Lesson Summary PDF</h3>
      <p style={{ marginTop: 0, color: '#718096', fontSize: 13 }}>
        Generate a downloadable lesson summary for the selected session.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label style={{ fontSize: 12, color: '#4a5568' }}>
          Session ID
          <input
            data-testid="lsp-session-id"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }}
          />
        </label>
        <label style={{ fontSize: 12, color: '#4a5568' }}>
          Topic
          <input
            data-testid="lsp-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }}
          />
        </label>
      </div>
      <label style={{ display: 'block', marginTop: 12, fontSize: 12, color: '#4a5568' }}>
        Teacher notes
        <textarea
          data-testid="lsp-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={{ display: 'block', width: '100%', padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }}
        />
      </label>
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button
          data-testid="lsp-generate"
          onClick={generate}
          disabled={loading}
          style={{ padding: '8px 14px', background: '#667eea', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          {loading ? 'Generating…' : 'Generate Summary'}
        </button>
        <button
          onClick={download}
          disabled={!result}
          style={{ padding: '8px 14px', background: '#48bb78', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', opacity: result ? 1 : 0.5 }}
        >
          Download
        </button>
      </div>
      {err && <div style={{ color: '#c53030', marginTop: 8 }}>{err}</div>}
      {result && (
        <pre
          data-testid="lsp-result"
          style={{ background: '#f7fafc', borderRadius: 8, padding: 12, marginTop: 12, fontSize: 12, whiteSpace: 'pre-wrap' }}
        >
          {result.text}
        </pre>
      )}
    </section>
  );
}
