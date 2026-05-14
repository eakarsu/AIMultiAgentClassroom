import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API } from '../context/AuthContext';

const s = {
  page: { minHeight: '100vh', background: '#f0f4f8' },
  nav: { background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 56 },
  backLink: { color: '#667eea', textDecoration: 'none', fontWeight: 600 },
  main: { maxWidth: 900, margin: '0 auto', padding: '32px 16px' },
  header: { textAlign: 'center', marginBottom: 32 },
  h1: { fontSize: 28, fontWeight: 800, color: '#1a202c', marginBottom: 8 },
  sub: { color: '#718096', fontSize: 15 },
  form: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 24 },
  formRow: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  input: { flex: 1, minWidth: 200, padding: '12px 16px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 15, outline: 'none' },
  select: { padding: '12px 16px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: '#fff', outline: 'none' },
  btn: { padding: '12px 24px', background: 'linear-gradient(135deg, #ed8936, #dd6b20)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 15 },
  summary: { background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', borderRadius: 12, padding: 24, marginBottom: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 },
  summaryItem: { textAlign: 'center' },
  summaryNum: { fontSize: 32, fontWeight: 800 },
  summaryLabel: { fontSize: 13, opacity: 0.85, marginTop: 4 },
  timeline: { position: 'relative' },
  timelineBar: { position: 'absolute', left: 28, top: 0, bottom: 0, width: 2, background: '#e2e8f0', zIndex: 0 },
  moduleCard: { position: 'relative', display: 'flex', gap: 16, marginBottom: 20 },
  moduleNum: (i) => ({
    width: 56, height: 56, borderRadius: '50%', background: `hsl(${220 + i * 25}, 70%, 55%)`, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0, zIndex: 1,
  }),
  moduleContent: { background: '#fff', flex: 1, borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  moduleTitle: { fontWeight: 700, fontSize: 16, color: '#1a202c', marginBottom: 6 },
  moduleDesc: { color: '#4a5568', fontSize: 14, lineHeight: 1.6, marginBottom: 10 },
  tags: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  tag: (color) => ({ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: color + '20', color }),
  objectives: { marginTop: 10, padding: '10px 14px', background: '#f7fafc', borderRadius: 8 },
  objItem: { fontSize: 13, color: '#4a5568', padding: '3px 0', display: 'flex', gap: 6 },
  error: { background: '#fff5f5', border: '1px solid #fc8181', color: '#c53030', padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 16 },
  loader: { textAlign: 'center', padding: 40, color: '#718096' },
};

export default function LearningPath() {
  const [topic, setTopic] = useState('');
  const [currentLevel, setCurrentLevel] = useState('beginner');
  const [path, setPath] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    setPath(null);
    try {
      const res = await axios.post(`${API}/api/ai/learning-path`, { topic, currentLevel });
      setPath(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate learning path');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <Link to="/" style={s.backLink}>← Dashboard</Link>
        <span style={{ fontWeight: 700, color: '#1a202c' }}>🗺️ Learning Path Generator</span>
      </nav>

      <main style={s.main}>
        <div style={s.header}>
          <h1 style={s.h1}>🗺️ Personalized Learning Path</h1>
          <p style={s.sub}>AI Curriculum Designer creates a structured, sequenced learning plan tailored to your level</p>
        </div>

        <div style={s.form}>
          {error && <div style={s.error}>{error}</div>}
          <form onSubmit={generate} style={s.formRow}>
            <input
              style={s.input}
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="What do you want to learn? (e.g., Machine Learning, Spanish, Photography)"
              required
            />
            <select style={s.select} value={currentLevel} onChange={e => setCurrentLevel(e.target.value)}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <button style={s.btn} type="submit" disabled={loading}>
              {loading ? 'Generating...' : 'Generate Path'}
            </button>
          </form>
        </div>

        {loading && (
          <div style={s.loader}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Curriculum Designer is creating your path...</div>
            <div style={{ fontSize: 13, marginTop: 6, color: '#a0aec0' }}>Analyzing your background and building a personalized plan</div>
          </div>
        )}

        {path && (
          <>
            <div style={s.summary}>
              <div style={s.summaryItem}><div style={s.summaryNum}>{path.modules?.length}</div><div style={s.summaryLabel}>Modules</div></div>
              <div style={s.summaryItem}><div style={s.summaryNum}>{path.total_estimated_hours}h</div><div style={s.summaryLabel}>Total Hours</div></div>
              <div style={s.summaryItem}><div style={s.summaryNum}>{path.certification_available ? '✓' : '—'}</div><div style={s.summaryLabel}>Certification</div></div>
              <div style={{ flex: 1, minWidth: 200 }}>
                {path.recommended_pace && <div><strong>Recommended Pace:</strong> {path.recommended_pace}</div>}
                {path.difficulty_progression && <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>{path.difficulty_progression}</div>}
              </div>
            </div>

            <div style={s.timeline}>
              <div style={s.timelineBar} />
              {path.modules?.map((mod, i) => (
                <div key={i} style={s.moduleCard}>
                  <div style={s.moduleNum(i)}>{i + 1}</div>
                  <div style={s.moduleContent}>
                    <div style={s.moduleTitle}>{mod.title}</div>
                    <div style={s.moduleDesc}>{mod.description}</div>
                    <div style={s.tags}>
                      <span style={s.tag('#ed8936')}>{mod.estimated_hours}h</span>
                      {mod.prerequisites?.map((p, j) => <span key={j} style={s.tag('#667eea')}>Prereq: {p}</span>)}
                      {mod.resources?.map((r, j) => <span key={j} style={s.tag('#48bb78')}>{r}</span>)}
                    </div>
                    {mod.learning_objectives && mod.learning_objectives.length > 0 && (
                      <div style={s.objectives}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Objectives</div>
                        {mod.learning_objectives.map((obj, j) => (
                          <div key={j} style={s.objItem}><span>•</span><span>{obj}</span></div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
