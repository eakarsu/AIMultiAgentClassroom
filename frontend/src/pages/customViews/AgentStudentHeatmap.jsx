import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API } from '../../context/AuthContext';

// VIZ component: agent x student interaction heatmap, rendered as a colored grid.
function shade(value, max) {
  // single-hue ramp from light to deep purple
  const ratio = max > 0 ? value / max : 0;
  const start = [237, 233, 254]; // very light
  const end = [102, 51, 153]; // deep
  const mix = start.map((s, i) => Math.round(s + (end[i] - s) * ratio));
  return `rgb(${mix.join(',')})`;
}

export default function AgentStudentHeatmap() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    axios
      .get(`${API}/api/custom-views/agent-student-heatmap?session_id=1`)
      .then((res) => alive && setData(res.data))
      .catch((e) => alive && setErr(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <div data-testid="heatmap-loading">Loading heatmap…</div>;
  if (err) return <div style={{ color: '#c53030' }}>Error: {err}</div>;
  if (!data) return null;

  const { agents = [], students = [], matrix = [], metadata = {} } = data;
  const max = metadata.max_value || 1;
  const cell = 38;

  return (
    <section style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
      <h3 style={{ margin: 0, marginBottom: 8 }}>Agent &times; Student Interaction Heatmap</h3>
      <p style={{ marginTop: 0, color: '#718096', fontSize: 13 }}>
        Cell value = number of meaningful interactions in the lesson (max {max})
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table
          data-testid="heatmap-table"
          style={{ borderCollapse: 'separate', borderSpacing: 4, minWidth: 360 }}
        >
          <thead>
            <tr>
              <th style={{ textAlign: 'left', fontSize: 12, color: '#718096', paddingRight: 8 }}></th>
              {students.map((s) => (
                <th key={s} style={{ fontSize: 12, color: '#4a5568', padding: '0 4px' }}>{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.map((agent, ai) => (
              <tr key={agent}>
                <td style={{ fontSize: 12, color: '#4a5568', paddingRight: 8, whiteSpace: 'nowrap' }}>{agent}</td>
                {students.map((s, si) => {
                  const v = matrix[ai]?.[si] ?? 0;
                  return (
                    <td
                      key={s}
                      title={`${agent} → ${s}: ${v}`}
                      style={{
                        width: cell,
                        height: cell,
                        background: shade(v, max),
                        color: v / max > 0.55 ? '#fff' : '#1a202c',
                        textAlign: 'center',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {v}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
