import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API } from '../../context/AuthContext';

// NON-VIZ: CRUD editor for agent persona rule packs.
export default function PersonaRulesEditor() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [draft, setDraft] = useState({ agent: '', tone: 'neutral', rules: '', active: true });
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  const url = `${API}/api/custom-views/persona-rules`;

  const reload = async () => {
    setLoading(true);
    try {
      const res = await axios.get(url);
      setRows(res.data.data || []);
      setErr('');
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const create = async () => {
    if (!draft.agent.trim()) return;
    try {
      await axios.post(url, {
        agent: draft.agent.trim(),
        tone: draft.tone.trim() || 'neutral',
        rules: draft.rules.split('\n').map((s) => s.trim()).filter(Boolean),
        active: draft.active,
      });
      setDraft({ agent: '', tone: 'neutral', rules: '', active: true });
      await reload();
    } catch (e) {
      setErr(e.message);
    }
  };

  const beginEdit = (row) => {
    setEditingId(row.id);
    setEditDraft({
      agent: row.agent,
      tone: row.tone,
      rules: (row.rules || []).join('\n'),
      active: !!row.active,
    });
  };

  const saveEdit = async () => {
    try {
      await axios.put(`${url}/${editingId}`, {
        ...editDraft,
        rules: editDraft.rules.split('\n').map((s) => s.trim()).filter(Boolean),
      });
      setEditingId(null);
      setEditDraft(null);
      await reload();
    } catch (e) {
      setErr(e.message);
    }
  };

  const remove = async (id) => {
    try {
      await axios.delete(`${url}/${id}`);
      await reload();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <section style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
      <h3 style={{ margin: 0, marginBottom: 8 }}>Agent Persona Rules Editor</h3>
      <p style={{ marginTop: 0, color: '#718096', fontSize: 13 }}>
        Define how each AI agent behaves in the classroom. Add, edit, or remove rule packs.
      </p>

      <div
        style={{
          background: '#f7fafc',
          borderRadius: 8,
          padding: 12,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 2fr auto auto',
          gap: 8,
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <input
          data-testid="pr-new-agent"
          placeholder="Agent name"
          value={draft.agent}
          onChange={(e) => setDraft({ ...draft, agent: e.target.value })}
          style={{ padding: 6, border: '1px solid #e2e8f0', borderRadius: 6 }}
        />
        <input
          data-testid="pr-new-tone"
          placeholder="Tone (e.g. warm)"
          value={draft.tone}
          onChange={(e) => setDraft({ ...draft, tone: e.target.value })}
          style={{ padding: 6, border: '1px solid #e2e8f0', borderRadius: 6 }}
        />
        <input
          data-testid="pr-new-rules"
          placeholder="Rules — one per line"
          value={draft.rules}
          onChange={(e) => setDraft({ ...draft, rules: e.target.value })}
          style={{ padding: 6, border: '1px solid #e2e8f0', borderRadius: 6 }}
        />
        <label style={{ fontSize: 12, color: '#4a5568' }}>
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
          />{' '}
          active
        </label>
        <button
          data-testid="pr-create"
          onClick={create}
          style={{ padding: '6px 12px', background: '#667eea', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          Add
        </button>
      </div>

      {err && <div style={{ color: '#c53030', marginBottom: 8 }}>{err}</div>}
      {loading ? (
        <div>Loading rules…</div>
      ) : (
        <table data-testid="pr-table" style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f7fafc' }}>
              <th style={{ textAlign: 'left', padding: 6 }}>Agent</th>
              <th style={{ textAlign: 'left', padding: 6 }}>Tone</th>
              <th style={{ textAlign: 'left', padding: 6 }}>Rules</th>
              <th style={{ textAlign: 'left', padding: 6 }}>Active</th>
              <th style={{ textAlign: 'right', padding: 6 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid #edf2f7' }}>
                {editingId === r.id ? (
                  <>
                    <td style={{ padding: 6 }}>
                      <input
                        value={editDraft.agent}
                        onChange={(e) => setEditDraft({ ...editDraft, agent: e.target.value })}
                        style={{ width: '100%', padding: 4 }}
                      />
                    </td>
                    <td style={{ padding: 6 }}>
                      <input
                        value={editDraft.tone}
                        onChange={(e) => setEditDraft({ ...editDraft, tone: e.target.value })}
                        style={{ width: '100%', padding: 4 }}
                      />
                    </td>
                    <td style={{ padding: 6 }}>
                      <textarea
                        rows={2}
                        value={editDraft.rules}
                        onChange={(e) => setEditDraft({ ...editDraft, rules: e.target.value })}
                        style={{ width: '100%', padding: 4 }}
                      />
                    </td>
                    <td style={{ padding: 6 }}>
                      <input
                        type="checkbox"
                        checked={editDraft.active}
                        onChange={(e) => setEditDraft({ ...editDraft, active: e.target.checked })}
                      />
                    </td>
                    <td style={{ padding: 6, textAlign: 'right' }}>
                      <button onClick={saveEdit} style={{ marginRight: 6 }}>Save</button>
                      <button onClick={() => setEditingId(null)}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: 6, fontWeight: 600 }}>{r.agent}</td>
                    <td style={{ padding: 6 }}>{r.tone}</td>
                    <td style={{ padding: 6 }}>
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {(r.rules || []).map((rule, i) => (
                          <li key={i}>{rule}</li>
                        ))}
                      </ul>
                    </td>
                    <td style={{ padding: 6 }}>{r.active ? 'yes' : 'no'}</td>
                    <td style={{ padding: 6, textAlign: 'right' }}>
                      <button onClick={() => beginEdit(r)} style={{ marginRight: 6 }}>Edit</button>
                      <button onClick={() => remove(r.id)} style={{ color: '#c53030' }}>Delete</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 12, textAlign: 'center', color: '#718096' }}>
                  No persona rule packs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
