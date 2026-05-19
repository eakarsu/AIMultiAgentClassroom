import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API } from '../../context/AuthContext';

// VIZ component: per-student engagement scores rendered as inline SVG lines.
// Uses pure SVG (no chart deps) so it works in the existing dependency set.
const PALETTE = ['#667eea', '#48bb78', '#ed8936', '#9f7aea', '#38b2ac', '#e53e3e'];

export default function EngagementTimeline() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    axios
      .get(`${API}/api/custom-views/engagement-timeline?session_id=1`)
      .then((res) => {
        if (alive) setData(res.data);
      })
      .catch((e) => alive && setErr(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <div data-testid="engagement-loading">Loading engagement timeline…</div>;
  if (err) return <div style={{ color: '#c53030' }}>Error: {err}</div>;
  if (!data) return null;

  const width = 640;
  const height = 220;
  const padding = { top: 20, right: 20, bottom: 32, left: 40 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const slots = data.slots || [];
  const series = data.series || [];

  const xFor = (i) => padding.left + (i / Math.max(1, slots.length - 1)) * innerW;
  const yFor = (v) => padding.top + innerH - (v / 100) * innerH;

  return (
    <section style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
      <h3 style={{ margin: 0, marginBottom: 8 }}>Student Engagement Timeline</h3>
      <p style={{ marginTop: 0, color: '#718096', fontSize: 13 }}>
        Engagement score (0–100) per student across {slots.length} timeslots
      </p>
      <svg width={width} height={height} role="img" aria-label="Engagement timeline chart" data-testid="engagement-svg">
        {/* axis */}
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + innerH} stroke="#cbd5e0" />
        <line x1={padding.left} y1={padding.top + innerH} x2={padding.left + innerW} y2={padding.top + innerH} stroke="#cbd5e0" />
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <text x={padding.left - 6} y={yFor(v) + 3} fontSize="10" textAnchor="end" fill="#718096">{v}</text>
            <line x1={padding.left} y1={yFor(v)} x2={padding.left + innerW} y2={yFor(v)} stroke="#edf2f7" />
          </g>
        ))}
        {slots.map((s, i) => (
          <text key={s} x={xFor(i)} y={padding.top + innerH + 14} fontSize="10" textAnchor="middle" fill="#718096">
            {s}
          </text>
        ))}
        {/* series lines */}
        {series.map((row, idx) => {
          const color = PALETTE[idx % PALETTE.length];
          const d = (row.points || [])
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(p.score)}`)
            .join(' ');
          return <path key={row.student} d={d} stroke={color} strokeWidth="2" fill="none" />;
        })}
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
        {series.map((row, idx) => (
          <span key={row.student} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span
              style={{
                width: 10,
                height: 10,
                background: PALETTE[idx % PALETTE.length],
                display: 'inline-block',
                borderRadius: 2,
              }}
            />
            {row.student}
          </span>
        ))}
      </div>
    </section>
  );
}
