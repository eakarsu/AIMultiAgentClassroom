import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API } from '../context/AuthContext';

const s = {
  page: { minHeight: '100vh', background: '#f0f4f8' },
  nav: { background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 56 },
  backLink: { color: '#667eea', textDecoration: 'none', fontWeight: 600 },
  main: { maxWidth: 800, margin: '0 auto', padding: '32px 16px' },
  header: { textAlign: 'center', marginBottom: 32 },
  h1: { fontSize: 28, fontWeight: 800, color: '#1a202c', marginBottom: 8 },
  sub: { color: '#718096', fontSize: 15 },
  overallCard: { background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', borderRadius: 16, padding: 32, textAlign: 'center', marginBottom: 32 },
  overallScore: { fontSize: 72, fontWeight: 900, lineHeight: 1 },
  overallLabel: { fontSize: 16, opacity: 0.85, marginTop: 8 },
  statsRow: { display: 'flex', justifyContent: 'center', gap: 32, marginTop: 20 },
  statItem: { textAlign: 'center' },
  statNum: { fontSize: 24, fontWeight: 700 },
  statLabel: { fontSize: 12, opacity: 0.75, marginTop: 2 },
  card: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 12 },
  topicRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  topicName: { fontWeight: 600, fontSize: 16, color: '#1a202c', flex: 1 },
  score: (pct) => ({ fontSize: 18, fontWeight: 800, color: pct >= 80 ? '#48bb78' : pct >= 60 ? '#ed8936' : '#fc8181' }),
  barBg: { background: '#e2e8f0', borderRadius: 99, height: 10, overflow: 'hidden' },
  bar: (pct) => ({
    height: '100%', borderRadius: 99, width: `${Math.max(2, pct)}%`,
    background: pct >= 80 ? 'linear-gradient(90deg, #48bb78, #38a169)' : pct >= 60 ? 'linear-gradient(90deg, #ed8936, #dd6b20)' : 'linear-gradient(90deg, #fc8181, #e53e3e)',
    transition: 'width 0.8s ease',
  }),
  meta: { display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: '#a0aec0' },
  grade: (pct) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 36, height: 36, borderRadius: '50%', fontWeight: 800, fontSize: 16,
    background: pct >= 80 ? '#c6f6d5' : pct >= 60 ? '#feebc8' : '#fed7d7',
    color: pct >= 80 ? '#276749' : pct >= 60 ? '#744210' : '#c53030',
  }),
  empty: { textAlign: 'center', padding: 60, color: '#718096' },
  loader: { textAlign: 'center', padding: 40, color: '#718096' },
};

const gradeLabel = (pct) => pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';

export default function Progress() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/api/ai/progress`)
      .then(r => setData(r.data))
      .catch(() => setData({ progress: [], overall_mastery: 0, topics_studied: 0 }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <Link to="/" style={s.backLink}>← Dashboard</Link>
        <span style={{ fontWeight: 700, color: '#1a202c' }}>📊 My Progress</span>
      </nav>

      <main style={s.main}>
        <div style={s.header}>
          <h1 style={s.h1}>📊 My Learning Progress</h1>
          <p style={s.sub}>Track your mastery across all topics you've studied</p>
        </div>

        {loading ? (
          <div style={s.loader}>Loading your progress...</div>
        ) : (
          <>
            <div style={s.overallCard}>
              <div style={s.overallScore}>{data?.overall_mastery ?? 0}%</div>
              <div style={s.overallLabel}>Overall Mastery Score</div>
              <div style={s.statsRow}>
                <div style={s.statItem}>
                  <div style={s.statNum}>{data?.topics_studied ?? 0}</div>
                  <div style={s.statLabel}>Topics Studied</div>
                </div>
                <div style={s.statItem}>
                  <div style={s.statNum}>{gradeLabel(data?.overall_mastery ?? 0)}</div>
                  <div style={s.statLabel}>Overall Grade</div>
                </div>
                <div style={s.statItem}>
                  <div style={s.statNum}>{data?.progress?.reduce((s, p) => s + parseInt(p.quiz_attempts || 0), 0) ?? 0}</div>
                  <div style={s.statLabel}>Quizzes Taken</div>
                </div>
              </div>
            </div>

            {data?.progress?.length === 0 ? (
              <div style={s.empty}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🌱</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>No progress yet</div>
                <div style={{ marginTop: 8 }}>Start a classroom session and take a quiz to see your mastery scores here.</div>
                <Link to="/" style={{ display: 'inline-block', marginTop: 16, padding: '10px 20px', background: '#667eea', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
                  Start Learning →
                </Link>
              </div>
            ) : (
              data?.progress?.map((p, i) => {
                const pct = p.mastery_score || 0;
                return (
                  <div key={i} style={s.card}>
                    <div style={s.topicRow}>
                      <div style={s.topicName}>{p.topic}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={s.score(pct)}>{pct}%</span>
                        <span style={s.grade(pct)}>{gradeLabel(pct)}</span>
                      </div>
                    </div>
                    <div style={s.barBg}>
                      <div style={s.bar(pct)} />
                    </div>
                    <div style={s.meta}>
                      <span>Sessions: {p.sessions_completed}</span>
                      <span>Quizzes: {p.quiz_attempts || 0}</span>
                      <span>Last studied: {new Date(p.last_assessed).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </main>
    </div>
  );
}
