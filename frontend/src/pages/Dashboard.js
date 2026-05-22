import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API } from '../context/AuthContext';

const s = {
  page: { minHeight: '100vh', background: '#f0f4f8', padding: '0' },
  nav: { background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 },
  logo: { fontSize: 20, fontWeight: 700, color: '#667eea', textDecoration: 'none' },
  navLinks: { display: 'flex', gap: 24, alignItems: 'center' },
  navLink: { color: '#4a5568', textDecoration: 'none', fontWeight: 500, fontSize: 14 },
  logoutBtn: { padding: '8px 16px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontWeight: 500, color: '#4a5568' },
  main: { maxWidth: 1100, margin: '0 auto', padding: '32px 24px' },
  header: { marginBottom: 32 },
  h1: { fontSize: 28, fontWeight: 700, color: '#1a202c' },
  sub: { color: '#718096', marginTop: 4, fontSize: 15 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 32 },
  statCard: (color) => ({ background: '#fff', borderRadius: 12, padding: '20px 24px', borderLeft: `4px solid ${color}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }),
  statNum: { fontSize: 32, fontWeight: 700, color: '#1a202c' },
  statLabel: { color: '#718096', fontSize: 14, marginTop: 4 },
  sectionTitle: { fontSize: 20, fontWeight: 700, color: '#1a202c', marginBottom: 16 },
  newSessionCard: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 12, padding: 24, color: '#fff', marginBottom: 24 },
  form: { display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' },
  input: { flex: 1, minWidth: 200, padding: '10px 14px', borderRadius: 8, border: 'none', fontSize: 15, outline: 'none' },
  select: { padding: '10px 14px', borderRadius: 8, border: 'none', fontSize: 14, background: 'rgba(255,255,255,0.9)' },
  btn: (bg) => ({ padding: '10px 20px', background: bg || '#fff', color: bg ? '#fff' : '#667eea', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }),
  sessionCard: { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  badge: (color) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: color + '20', color: color }),
  pagination: { display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' },
  pageBtn: (active) => ({ padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: active ? '#667eea' : '#fff', color: active ? '#fff' : '#4a5568', cursor: 'pointer', fontWeight: 500 }),
  empty: { textAlign: 'center', padding: 40, color: '#718096' },
  error: { background: '#fff5f5', border: '1px solid #fc8181', color: '#c53030', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 },
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [progress, setProgress] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchSessions = async (p = 1) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/classroom/sessions?page=${p}&limit=5`);
      setSessions(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const res = await axios.get(`${API}/api/ai/progress`);
      setProgress(res.data);
    } catch {}
  };

  useEffect(() => {
    fetchSessions(page);
    fetchProgress();
  }, [page]);

  const createSession = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setCreating(true);
    setError('');
    try {
      const res = await axios.post(`${API}/api/classroom/sessions`, { topic, subject, difficulty });
      navigate(`/session/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create session');
      setCreating(false);
    }
  };

  const statusColor = { active: '#48bb78', completed: '#667eea', paused: '#ed8936' };

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <Link to="/" style={s.logo}>🎓 AI Classroom</Link>
        <div style={s.navLinks}>
          <Link to="/progress" style={s.navLink}>Progress</Link>
          <Link to="/learning-path" style={s.navLink}>Learning Path</Link>
          <Link to="/custom-views" style={s.navLink} data-testid="nav-custom-views">Classroom Views</Link>
          <span style={{ color: '#cbd5e0' }}>|</span>
          <span style={{ fontSize: 14, color: '#4a5568' }}>{user?.email}</span>
          <button style={s.logoutBtn} onClick={logout}>Sign Out</button>
        </div>
      </nav>

      <main style={s.main}>
        <div style={s.header}>
          <h1 style={s.h1}>Learning Dashboard</h1>
          <p style={s.sub}>Welcome back, {user?.email?.split('@')[0]}! Keep learning.</p>
        </div>

        {/* Stats */}
        <div style={s.grid}>
          <div style={s.statCard('#667eea')}>
            <div style={s.statNum}>{progress?.topics_studied ?? '-'}</div>
            <div style={s.statLabel}>Topics Studied</div>
          </div>
          <div style={s.statCard('#48bb78')}>
            <div style={s.statNum}>{progress?.overall_mastery ?? '-'}%</div>
            <div style={s.statLabel}>Overall Mastery</div>
          </div>
          <div style={s.statCard('#ed8936')}>
            <div style={s.statNum}>{sessions.length}</div>
            <div style={s.statLabel}>Active Sessions</div>
          </div>
        </div>

        {/* New Session */}
        <div style={s.newSessionCard}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Start a New Session</h2>
          <p style={{ fontSize: 14, opacity: 0.9 }}>Enter any topic and your AI tutor team will teach you interactively</p>
          {error && <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '8px 12px', marginTop: 12, fontSize: 13 }}>{error}</div>}
          <form onSubmit={createSession} style={s.form}>
            <input style={s.input} value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic (e.g., Quantum Computing, World War I, Python decorators)" required />
            <input style={{ ...s.input, flex: '0 1 160px' }} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject (optional)" />
            <select style={s.select} value={difficulty} onChange={e => setDifficulty(e.target.value)}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <button style={s.btn()} type="submit" disabled={creating}>
              {creating ? 'Starting...' : 'Start Learning →'}
            </button>
          </form>
        </div>

        {/* Sessions */}
        <div>
          <h2 style={s.sectionTitle}>Your Sessions</h2>
          {loading ? (
            <div style={s.empty}>Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div style={s.empty}>No sessions yet. Start your first learning session above!</div>
          ) : (
            sessions.map(session => (
              <div key={session.id} style={s.sessionCard}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16, color: '#1a202c', marginBottom: 6 }}>{session.topic}</div>
                  <div style={{ fontSize: 13, color: '#718096', marginBottom: 8 }}>
                    {session.subject && <span>{session.subject} · </span>}
                    {session.difficulty} · {session.message_count} messages · {session.quiz_count} quiz(zes)
                  </div>
                  <span style={s.badge(statusColor[session.status] || '#718096')}>{session.status}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexDirection: 'column', alignItems: 'flex-end' }}>
                  <button
                    style={s.btn('#667eea')}
                    onClick={() => navigate(`/session/${session.id}`)}
                  >
                    {session.status === 'active' ? 'Continue' : 'Review'}
                  </button>
                  <button
                    style={{ ...s.btn(), color: '#764ba2', border: '1.5px solid #764ba2', padding: '6px 14px' }}
                    onClick={() => navigate(`/debate/${session.id}`)}
                  >
                    Debate
                  </button>
                </div>
              </div>
            ))
          )}

          {totalPages > 1 && (
            <div style={s.pagination}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} style={s.pageBtn(p === page)} onClick={() => setPage(p)}>{p}</button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
