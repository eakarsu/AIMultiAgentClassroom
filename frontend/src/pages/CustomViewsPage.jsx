import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EngagementTimeline from './customViews/EngagementTimeline';
import AgentStudentHeatmap from './customViews/AgentStudentHeatmap';
import LessonSummaryPdf from './customViews/LessonSummaryPdf';
import PersonaRulesEditor from './customViews/PersonaRulesEditor';

const s = {
  page: { minHeight: '100vh', background: '#f0f4f8' },
  layout: { display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: '100vh' },
  side: { background: '#fff', borderRight: '1px solid #e2e8f0', padding: '24px 16px' },
  logo: { fontSize: 18, fontWeight: 700, color: '#667eea', marginBottom: 24, textDecoration: 'none', display: 'block' },
  nav: { display: 'flex', flexDirection: 'column', gap: 6 },
  navLink: (active) => ({
    color: active ? '#fff' : '#4a5568',
    background: active ? '#667eea' : 'transparent',
    textDecoration: 'none',
    padding: '8px 12px',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 500,
  }),
  main: { padding: '32px 28px', overflowX: 'auto' },
  h1: { fontSize: 26, fontWeight: 700, color: '#1a202c', marginTop: 0 },
  sub: { color: '#718096', marginTop: 4, fontSize: 14, marginBottom: 24 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
};

export default function CustomViewsPage() {
  const { user, logout } = useAuth();

  return (
    <div style={s.page}>
      <div style={s.layout}>
        <aside style={s.side} data-testid="sidebar">
          <Link to="/" style={s.logo}>🎓 AI Classroom</Link>
          <nav style={s.nav}>
            <Link to="/" style={s.navLink(false)}>Dashboard</Link>
            <Link to="/progress" style={s.navLink(false)}>Progress</Link>
            <Link to="/learning-path" style={s.navLink(false)}>Learning Path</Link>
            <Link to="/ai-tools" style={s.navLink(false)}>AI Tools</Link>
            <Link to="/teacher" style={s.navLink(false)}>Teacher</Link>
            <Link to="/custom-views" style={s.navLink(true)} data-testid="sidebar-custom-views">
              Classroom Views
            </Link>
          </nav>
          <div style={{ marginTop: 32, fontSize: 12, color: '#718096' }}>
            {user?.email}
            <br />
            <button onClick={logout} style={{ marginTop: 8 }}>Sign out</button>
          </div>
        </aside>
        <main style={s.main}>
          <h1 style={s.h1} data-testid="custom-views-title">Classroom Views</h1>
          <p style={s.sub}>Specialised multi-agent classroom insights and configuration panels.</p>
          <div style={s.grid}>
            <EngagementTimeline />
            <AgentStudentHeatmap />
            <LessonSummaryPdf />
            <PersonaRulesEditor />
          </div>
        </main>
      </div>
    </div>
  );
}
