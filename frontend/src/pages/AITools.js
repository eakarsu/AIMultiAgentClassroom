import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth, API } from '../context/AuthContext';

const s = {
  page: { minHeight: '100vh', background: '#f0f4f8' },
  nav: { background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 56 },
  logo: { color: '#1a202c', fontWeight: 800, fontSize: 18, textDecoration: 'none' },
  navLinks: { display: 'flex', gap: 24, alignItems: 'center', marginLeft: 'auto' },
  navLink: { color: '#4a5568', textDecoration: 'none', fontWeight: 500, fontSize: 14 },
  logoutBtn: { padding: '6px 12px', background: '#f56565', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  main: { maxWidth: 900, margin: '0 auto', padding: '32px 16px' },
  header: { textAlign: 'center', marginBottom: 32 },
  h1: { fontSize: 28, fontWeight: 800, color: '#1a202c', marginBottom: 8 },
  sub: { color: '#718096', fontSize: 15 },
  toolGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 24 },
  toolCard: (active) => ({
    padding: 16,
    background: active ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#fff',
    color: active ? '#fff' : '#1a202c',
    border: active ? 'none' : '1.5px solid #e2e8f0',
    borderRadius: 12,
    cursor: 'pointer',
    boxShadow: active ? '0 4px 12px rgba(102,126,234,0.3)' : '0 1px 4px rgba(0,0,0,0.08)',
  }),
  toolTitle: { fontWeight: 700, fontSize: 16, marginBottom: 6 },
  toolDesc: { fontSize: 13, opacity: 0.85, lineHeight: 1.5 },
  form: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  formGroup: { marginBottom: 14 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#2d3748', marginBottom: 6 },
  input: { width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none' },
  textarea: { width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', minHeight: 100, fontFamily: 'inherit' },
  btn: { width: '100%', padding: '12px 24px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 15 },
  error: { background: '#fff5f5', border: '1px solid #fc8181', color: '#c53030', padding: '10px 14px', borderRadius: 8, fontSize: 14, marginTop: 16 },
  result: { background: '#f7fafc', borderRadius: 8, padding: 16, marginTop: 16, border: '1px solid #e2e8f0' },
  resultTitle: { fontWeight: 700, color: '#2d3748', marginBottom: 8 },
  pre: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13, color: '#1a202c', margin: 0, fontFamily: 'Monaco, monospace' },
};

const TOOLS = [
  {
    key: 'misconception-detection',
    label: 'Misconception Detection',
    icon: '🧐',
    endpoint: '/api/ai/misconception-detection',
    description: 'DIAGNOSTICIAN reads recent session messages, returns misconceptions with quoted evidence, correction, and remediation activity.',
    fields: [
      { key: 'sessionId', label: 'Session ID', type: 'text', required: true, placeholder: 'Numeric session ID' },
      { key: 'messageLimit', label: 'Recent Messages to Inspect', type: 'number', placeholder: '20' },
    ],
  },
  {
    key: 'difficulty-adapt',
    label: 'Difficulty Adapt',
    icon: '🎚️',
    endpoint: '/api/ai/difficulty-adapt',
    description: 'ADAPTIVE COACH reviews mastery and quiz history; recommends easier / same / harder difficulty.',
    fields: [
      { key: 'studentId', label: 'Student ID', type: 'text', required: true },
      { key: 'topic', label: 'Topic', type: 'text', placeholder: 'Subject area' },
      { key: 'targetDifficulty', label: 'Target Difficulty (optional)', type: 'text', placeholder: 'e.g. easier / harder' },
    ],
  },
];

export default function AITools() {
  const { user, logout } = useAuth();
  const [activeKey, setActiveKey] = useState(TOOLS[0].key);
  const [inputs, setInputs] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const tool = TOOLS.find(t => t.key === activeKey);

  const setField = (key, value) =>
    setInputs(prev => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const payload = {};
      tool.fields.forEach(f => {
        const v = inputs[f.key];
        if (v === undefined || v === '') return;
        payload[f.key] = f.type === 'number' ? Number(v) : v;
      });
      const res = await axios.post(`${API}${tool.endpoint}`, payload);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <Link to="/" style={s.logo}>🎓 AI Classroom</Link>
        <div style={s.navLinks}>
          <Link to="/progress" style={s.navLink}>Progress</Link>
          <Link to="/learning-path" style={s.navLink}>Learning Path</Link>
          <Link to="/ai-tools" style={s.navLink}>AI Tools</Link>
          <span style={{ color: '#cbd5e0' }}>|</span>
          <span style={{ fontSize: 14, color: '#4a5568' }}>{user?.email}</span>
          <button style={s.logoutBtn} onClick={logout}>Sign Out</button>
        </div>
      </nav>

      <main style={s.main}>
        <header style={s.header}>
          <h1 style={s.h1}>🧠 AI Tools</h1>
          <p style={s.sub}>Diagnose misconceptions and adapt difficulty using specialized AI agents.</p>
        </header>

        <div style={s.toolGrid}>
          {TOOLS.map(t => (
            <div
              key={t.key}
              style={s.toolCard(activeKey === t.key)}
              onClick={() => { setActiveKey(t.key); setInputs({}); setResult(null); setError(''); }}
            >
              <div style={{ fontSize: 24 }}>{t.icon}</div>
              <div style={s.toolTitle}>{t.label}</div>
              <div style={s.toolDesc}>{t.description}</div>
            </div>
          ))}
        </div>

        <form style={s.form} onSubmit={submit}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: '#1a202c' }}>{tool.icon} {tool.label}</h2>
          <p style={{ color: '#718096', fontSize: 14, marginBottom: 16 }}>{tool.description}</p>

          {tool.fields.map(field => (
            <div style={s.formGroup} key={field.key}>
              <label style={s.label}>{field.label}{field.required ? ' *' : ''}</label>
              {field.type === 'textarea' ? (
                <textarea
                  style={s.textarea}
                  required={field.required}
                  value={inputs[field.key] || ''}
                  onChange={e => setField(field.key, e.target.value)}
                  placeholder={field.placeholder || ''}
                />
              ) : (
                <input
                  style={s.input}
                  type={field.type}
                  required={field.required}
                  value={inputs[field.key] || ''}
                  onChange={e => setField(field.key, e.target.value)}
                  placeholder={field.placeholder || ''}
                />
              )}
            </div>
          ))}

          <button type="submit" style={s.btn} disabled={loading}>
            {loading ? 'Running…' : `Run ${tool.label}`}
          </button>

          {error && <div style={s.error}>{error}</div>}

          {result && (
            <div style={s.result}>
              <div style={s.resultTitle}>Result</div>
              <pre style={s.pre}>
                {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
