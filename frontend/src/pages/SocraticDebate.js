import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { API } from '../context/AuthContext';

const s = {
  page: { minHeight: '100vh', background: '#f0f4f8' },
  nav: { background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 56 },
  backLink: { color: '#667eea', textDecoration: 'none', fontWeight: 600 },
  main: { maxWidth: 960, margin: '0 auto', padding: '32px 16px' },
  header: { textAlign: 'center', marginBottom: 32 },
  h1: { fontSize: 28, fontWeight: 800, color: '#1a202c', marginBottom: 8 },
  sub: { color: '#718096', fontSize: 15 },
  form: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 24 },
  inputRow: { display: 'flex', gap: 12 },
  input: { flex: 1, padding: '12px 16px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 15, outline: 'none' },
  btn: { padding: '12px 24px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 15 },
  debateGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 },
  argCard: (color) => ({ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderTop: `4px solid ${color}` }),
  argTitle: (color) => ({ fontSize: 16, fontWeight: 700, color, marginBottom: 12 }),
  argText: { fontSize: 14, lineHeight: 1.8, color: '#4a5568', whiteSpace: 'pre-wrap' },
  refCard: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderTop: '4px solid #667eea', marginBottom: 16 },
  insightList: { marginTop: 16 },
  insight: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 12px', background: '#f7fafc', borderRadius: 8, marginBottom: 8, fontSize: 14, color: '#4a5568' },
  commonGround: { background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: 10, padding: 16, fontSize: 14, color: '#276749', marginTop: 16 },
  error: { background: '#fff5f5', border: '1px solid #fc8181', color: '#c53030', padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 16 },
  loader: { textAlign: 'center', padding: 40, color: '#718096' },
  topicBadge: { background: '#667eea', color: '#fff', borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 600 },
};

export default function SocraticDebate() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [position, setPosition] = useState('');
  const [debate, setDebate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      axios.get(`${API}/api/classroom/sessions/${id}`).then(r => setSession(r.data)).catch(() => {});
    }
  }, [id]);

  const runDebate = async (e) => {
    e.preventDefault();
    if (!position.trim()) return;
    setLoading(true);
    setError('');
    setDebate(null);
    try {
      const res = await axios.post(`${API}/api/ai/socratic-debate`, { sessionId: parseInt(id), position });
      setDebate(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Debate failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <Link to={`/session/${id}`} style={s.backLink}>← Back to Session</Link>
        {session && <span style={s.topicBadge}>{session.topic}</span>}
      </nav>

      <main style={s.main}>
        <div style={s.header}>
          <h1 style={s.h1}>⚖️ Socratic Debate</h1>
          <p style={s.sub}>Three AI agents debate any position: an Advocate, a Critic, and a Referee who synthesizes both sides</p>
        </div>

        <div style={s.form}>
          {error && <div style={s.error}>{error}</div>}
          <form onSubmit={runDebate} style={s.inputRow}>
            <input
              style={s.input}
              value={position}
              onChange={e => setPosition(e.target.value)}
              placeholder={`Enter a debatable position about "${session?.topic || 'your topic'}"...`}
              required
            />
            <button style={s.btn} type="submit" disabled={loading}>
              {loading ? 'Debating...' : 'Start Debate'}
            </button>
          </form>
          {session && <p style={{ marginTop: 10, fontSize: 12, color: '#a0aec0' }}>Session topic: {session.topic}</p>}
        </div>

        {loading && (
          <div style={s.loader}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🤔</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Three AI agents are debating...</div>
            <div style={{ fontSize: 13, marginTop: 6, color: '#a0aec0' }}>This may take 15-30 seconds</div>
          </div>
        )}

        {debate && (
          <>
            <div style={s.debateGrid}>
              <div style={s.argCard('#48bb78')}>
                <div style={s.argTitle('#276749')}>✅ Advocate: For</div>
                <div style={s.argText}>{debate.argument_for}</div>
              </div>
              <div style={s.argCard('#fc8181')}>
                <div style={s.argTitle('#c53030')}>❌ Critic: Against</div>
                <div style={s.argText}>{debate.argument_against}</div>
              </div>
            </div>

            <div style={s.refCard}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#667eea', marginBottom: 12 }}>🏛️ Referee: Synthesis</div>
              <div style={s.argText}>{debate.referee_summary}</div>
              {debate.key_insights && debate.key_insights.length > 0 && (
                <div style={s.insightList}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#4a5568', marginBottom: 8 }}>Key Insights:</div>
                  {debate.key_insights.map((insight, i) => (
                    <div key={i} style={s.insight}>
                      <span>💡</span>
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              )}
              {debate.common_ground && (
                <div style={s.commonGround}>
                  <strong>Common Ground:</strong> {debate.common_ground}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
