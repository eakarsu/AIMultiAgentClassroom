import React, { useEffect, useState } from 'react';
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
  main: { maxWidth: 1100, margin: '0 auto', padding: '24px 16px' },
  h1: { fontSize: 24, fontWeight: 800, color: '#1a202c', marginBottom: 16 },
  card: { background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16 },
  cardH: { fontWeight: 700, fontSize: 15, marginBottom: 10, color: '#2d3748' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 },
  stat: { background: '#fff', borderRadius: 10, padding: 16, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  statN: { fontSize: 28, fontWeight: 800, color: '#667eea' },
  statL: { fontSize: 12, color: '#718096', marginTop: 4 },
  row: { display: 'flex', gap: 8, marginTop: 8 },
  input: { flex: 1, padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 13 },
  btn: { padding: '8px 14px', background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  list: { fontSize: 13, color: '#2d3748' },
  err: { background: '#fff5f5', border: '1px solid #fc8181', color: '#c53030', padding: 10, borderRadius: 6, fontSize: 13, marginTop: 8 },
  pre: { whiteSpace: 'pre-wrap', fontSize: 12, background: '#f7fafc', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0', maxHeight: 280, overflow: 'auto' },
};

function authHeader(token) { return { Authorization: `Bearer ${token}` }; }

export default function TeacherDashboard() {
  const { user, token, logout } = useAuth();
  const [counts, setCounts] = useState({});
  const [modules, setModules] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [newModule, setNewModule] = useState({ title: '', subject: '', difficulty: 'intermediate' });
  const [newAssignment, setNewAssignment] = useState({ title: '', module_id: '', max_score: 100 });
  const [parentForm, setParentForm] = useState({ studentId: '', period: 'last 2 weeks', tone: 'warm, professional' });
  const [parentResult, setParentResult] = useState(null);
  const [gradeForm, setGradeForm] = useState({ studentId: '', period: 'last term' });
  const [gradeResult, setGradeResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const headers = { headers: authHeader(token) };

  const reload = async () => {
    try {
      const [c, m, a] = await Promise.all([
        axios.get(`${API}/api/teacher/dashboard`, headers),
        axios.get(`${API}/api/teacher/curriculum`, headers),
        axios.get(`${API}/api/teacher/assignments`, headers),
      ]);
      setCounts(c.data?.counts || {});
      setModules(m.data?.data || []);
      setAssignments(a.data?.data || []);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  useEffect(() => { if (token) reload(); /* eslint-disable-next-line */ }, [token]);

  const createModule = async () => {
    if (!newModule.title) return;
    try {
      await axios.post(`${API}/api/teacher/curriculum`, newModule, headers);
      setNewModule({ title: '', subject: '', difficulty: 'intermediate' });
      reload();
    } catch (e) { setError(e.response?.data?.error || e.message); }
  };

  const createAssignment = async () => {
    if (!newAssignment.title) return;
    try {
      await axios.post(`${API}/api/teacher/assignments`, {
        ...newAssignment,
        module_id: newAssignment.module_id ? Number(newAssignment.module_id) : null,
      }, headers);
      setNewAssignment({ title: '', module_id: '', max_score: 100 });
      reload();
    } catch (e) { setError(e.response?.data?.error || e.message); }
  };

  const callParent = async () => {
    setLoading(true);
    setParentResult(null);
    setError('');
    try {
      const res = await axios.post(`${API}/api/ai/parent-communication`, {
        studentId: Number(parentForm.studentId),
        period: parentForm.period,
        tone: parentForm.tone,
      }, headers);
      setParentResult(res.data);
    } catch (e) {
      const status = e.response?.status;
      const missing = e.response?.data?.missing;
      setError(`${e.response?.data?.error || e.message}${status === 503 && missing ? ` (missing: ${missing})` : ''}`);
    } finally {
      setLoading(false);
    }
  };

  const callGradeSummary = async () => {
    setLoading(true);
    setGradeResult(null);
    setError('');
    try {
      const res = await axios.post(`${API}/api/ai/grade-summary`, {
        studentId: Number(gradeForm.studentId),
        period: gradeForm.period,
      }, headers);
      setGradeResult(res.data);
    } catch (e) {
      const status = e.response?.status;
      const missing = e.response?.data?.missing;
      setError(`${e.response?.data?.error || e.message}${status === 503 && missing ? ` (missing: ${missing})` : ''}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <Link to="/" style={s.logo}>AI Classroom</Link>
        <div style={s.navLinks}>
          <Link to="/" style={s.navLink}>Home</Link>
          <Link to="/ai-tools" style={s.navLink}>AI Tools</Link>
          <Link to="/teacher" style={{ ...s.navLink, color: '#667eea', fontWeight: 700 }}>Teacher</Link>
          <span style={{ fontSize: 13, color: '#718096' }}>{user?.email}</span>
          <button onClick={logout} style={s.logoutBtn}>Logout</button>
        </div>
      </nav>

      <div style={s.main}>
        <div style={s.h1}>Teacher Dashboard</div>

        <div style={s.grid4}>
          <div style={s.stat}><div style={s.statN}>{counts.modules || 0}</div><div style={s.statL}>Modules</div></div>
          <div style={s.stat}><div style={s.statN}>{counts.assignments || 0}</div><div style={s.statL}>Assignments</div></div>
          <div style={s.stat}><div style={s.statN}>{counts.submissions || 0}</div><div style={s.statL}>Submissions</div></div>
          <div style={s.stat}><div style={s.statN}>{counts.ungraded || 0}</div><div style={s.statL}>Ungraded</div></div>
        </div>

        {error && <div style={s.err}>{error}</div>}

        <div style={s.card}>
          <div style={s.cardH}>Curriculum Modules ({modules.length})</div>
          <div style={s.row}>
            <input style={s.input} placeholder="Title" value={newModule.title} onChange={(e) => setNewModule({ ...newModule, title: e.target.value })} />
            <input style={s.input} placeholder="Subject" value={newModule.subject} onChange={(e) => setNewModule({ ...newModule, subject: e.target.value })} />
            <select style={s.input} value={newModule.difficulty} onChange={(e) => setNewModule({ ...newModule, difficulty: e.target.value })}>
              <option>beginner</option><option>intermediate</option><option>advanced</option>
            </select>
            <button style={s.btn} onClick={createModule}>Add</button>
          </div>
          <ul style={s.list}>
            {modules.map(m => <li key={m.id}>#{m.id} <strong>{m.title}</strong> — {m.subject || 'no subject'} ({m.difficulty})</li>)}
          </ul>
        </div>

        <div style={s.card}>
          <div style={s.cardH}>Assignments ({assignments.length})</div>
          <div style={s.row}>
            <input style={s.input} placeholder="Title" value={newAssignment.title} onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })} />
            <input style={s.input} placeholder="Module ID (optional)" value={newAssignment.module_id} onChange={(e) => setNewAssignment({ ...newAssignment, module_id: e.target.value })} />
            <input style={s.input} type="number" placeholder="Max score" value={newAssignment.max_score} onChange={(e) => setNewAssignment({ ...newAssignment, max_score: Number(e.target.value) })} />
            <button style={s.btn} onClick={createAssignment}>Add</button>
          </div>
          <ul style={s.list}>
            {assignments.map(a => <li key={a.id}>#{a.id} <strong>{a.title}</strong> — max {a.max_score}</li>)}
          </ul>
        </div>

        <div style={s.card}>
          <div style={s.cardH}>AI: Parent Communication</div>
          <div style={s.row}>
            <input style={s.input} placeholder="Student ID" value={parentForm.studentId} onChange={(e) => setParentForm({ ...parentForm, studentId: e.target.value })} />
            <input style={s.input} placeholder="Period" value={parentForm.period} onChange={(e) => setParentForm({ ...parentForm, period: e.target.value })} />
            <input style={s.input} placeholder="Tone" value={parentForm.tone} onChange={(e) => setParentForm({ ...parentForm, tone: e.target.value })} />
            <button style={s.btn} disabled={loading} onClick={callParent}>{loading ? '...' : 'Generate'}</button>
          </div>
          {parentResult && <pre style={s.pre}>{JSON.stringify(parentResult.message || parentResult, null, 2)}</pre>}
        </div>

        <div style={s.card}>
          <div style={s.cardH}>AI: Grade Report Summary</div>
          <div style={s.row}>
            <input style={s.input} placeholder="Student ID" value={gradeForm.studentId} onChange={(e) => setGradeForm({ ...gradeForm, studentId: e.target.value })} />
            <input style={s.input} placeholder="Period" value={gradeForm.period} onChange={(e) => setGradeForm({ ...gradeForm, period: e.target.value })} />
            <button style={s.btn} disabled={loading} onClick={callGradeSummary}>{loading ? '...' : 'Generate'}</button>
          </div>
          {gradeResult && <pre style={s.pre}>{JSON.stringify(gradeResult.summary || gradeResult, null, 2)}</pre>}
        </div>
      </div>
    </div>
  );
}
