import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  card: { background: '#fff', borderRadius: 16, padding: '40px 36px', width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' },
  title: { textAlign: 'center', fontSize: 28, fontWeight: 700, color: '#1a202c', marginBottom: 8 },
  subtitle: { textAlign: 'center', color: '#718096', marginBottom: 32, fontSize: 14 },
  tabs: { display: 'flex', background: '#f7fafc', borderRadius: 8, padding: 4, marginBottom: 24 },
  tab: (active) => ({ flex: 1, padding: '8px 0', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14, background: active ? '#fff' : 'transparent', color: active ? '#667eea' : '#718096', boxShadow: active ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }),
  field: { marginBottom: 16 },
  label: { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#4a5568' },
  input: { width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 15, outline: 'none', transition: 'border-color 0.2s' },
  btn: { width: '100%', padding: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  error: { background: '#fff5f5', border: '1px solid #fc8181', color: '#c53030', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 },
};

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 48 }}>🎓</span>
        </div>
        <h1 style={s.title}>AI Classroom</h1>
        <p style={s.subtitle}>Multi-agent powered personalized learning</p>

        <div style={s.tabs}>
          <button style={s.tab(mode === 'login')} onClick={() => { setMode('login'); setError(''); }}>Sign In</button>
          <button style={s.tab(mode === 'register')} onClick={() => { setMode('register'); setError(''); }}>Sign Up</button>
        </div>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
          </div>
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
