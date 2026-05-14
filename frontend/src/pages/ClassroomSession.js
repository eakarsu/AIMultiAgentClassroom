import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { API } from '../context/AuthContext';

const s = {
  page: { minHeight: '100vh', background: '#f0f4f8', display: 'flex', flexDirection: 'column' },
  nav: { background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 56 },
  backLink: { color: '#667eea', textDecoration: 'none', fontWeight: 600 },
  topicBadge: { background: '#667eea', color: '#fff', borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 600 },
  main: { display: 'flex', flex: 1, maxWidth: 1100, margin: '24px auto', width: '100%', gap: 20, padding: '0 16px' },
  chatCol: { flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' },
  chatHeader: { padding: '16px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 16, color: '#1a202c', display: 'flex', alignItems: 'center', gap: 8 },
  messages: { flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 400, maxHeight: 'calc(100vh - 280px)' },
  msgBubble: (role) => ({
    maxWidth: '82%',
    alignSelf: role === 'student' ? 'flex-end' : 'flex-start',
    background: role === 'student' ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#f7fafc',
    color: role === 'student' ? '#fff' : '#2d3748',
    borderRadius: role === 'student' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
    padding: '12px 16px',
    fontSize: 14,
    lineHeight: 1.6,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  }),
  agentLabel: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, opacity: 0.7 },
  followUp: { background: '#fffbeb', border: '1px solid #f6e05e', borderRadius: 8, padding: '10px 14px', marginTop: 10, fontSize: 13, color: '#744210' },
  inputRow: { padding: '14px 16px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10 },
  textInput: { flex: 1, padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', resize: 'none' },
  sendBtn: { padding: '10px 20px', background: '#667eea', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 },
  sideCol: { width: 320, display: 'flex', flexDirection: 'column', gap: 16 },
  sideCard: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  sideTitle: { fontWeight: 700, fontSize: 15, color: '#1a202c', marginBottom: 14 },
  actionBtn: (color) => ({ width: '100%', padding: '11px', background: color, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14, marginBottom: 10 }),
  quizContainer: { marginTop: 4 },
  question: { marginBottom: 18, padding: '14px', background: '#f7fafc', borderRadius: 8 },
  option: (selected, correct, show) => ({
    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 6,
    borderRadius: 6, cursor: show ? 'default' : 'pointer',
    background: show && correct ? '#c6f6d5' : show && selected && !correct ? '#fed7d7' : selected ? '#ebf4ff' : '#fff',
    border: `1.5px solid ${show && correct ? '#68d391' : show && selected && !correct ? '#fc8181' : selected ? '#667eea' : '#e2e8f0'}`,
  }),
  scoreBox: (pct) => ({ background: pct >= 70 ? '#c6f6d5' : '#fed7d7', borderRadius: 10, padding: 16, textAlign: 'center', marginTop: 16 }),
  error: { background: '#fff5f5', border: '1px solid #fc8181', color: '#c53030', padding: '10px 14px', borderRadius: 8, fontSize: 13, margin: '8px 0' },
  loader: { textAlign: 'center', padding: 20, color: '#718096', fontSize: 14 },
};

export default function ClassroomSession() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEnd = useRef(null);

  useEffect(() => {
    axios.get(`${API}/api/classroom/sessions/${id}`).then(r => setSession(r.data)).catch(() => setError('Session not found'));
    axios.get(`${API}/api/classroom/sessions/${id}/messages`).then(r => {
      setMessages(r.data.data.map(m => {
        let parsed = m.content;
        try { parsed = JSON.parse(m.content); } catch {}
        return { ...m, parsed };
      }));
    }).catch(() => {});
  }, [id]);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || loading) return;
    const msg = message;
    setMessage('');
    setLoading(true);
    setError('');
    setMessages(prev => [...prev, { agent_role: 'student', parsed: msg, message_type: 'question' }]);
    try {
      const res = await axios.post(`${API}/api/ai/tutor-response`, { sessionId: parseInt(id), studentMessage: msg });
      setMessages(prev => [...prev, { agent_role: 'tutor', parsed: res.data, message_type: 'teaching' }]);
    } catch (err) {
      setError(err.response?.data?.error || 'Tutor is unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async () => {
    setQuizLoading(true);
    setQuiz(null);
    setQuizResult(null);
    setAnswers({});
    setError('');
    try {
      const res = await axios.post(`${API}/api/ai/quiz-master`, { sessionId: parseInt(id) });
      setQuiz(res.data.questions);
      setAttemptId(res.data.attemptId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate quiz');
    } finally {
      setQuizLoading(false);
    }
  };

  const submitQuiz = async () => {
    if (Object.keys(answers).length < quiz.length) {
      setError('Please answer all questions before submitting');
      return;
    }
    setError('');
    try {
      const res = await axios.post(`${API}/api/ai/grade-quiz`, { attemptId, answers });
      setQuizResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to grade quiz');
    }
  };

  const renderMessage = (msg, i) => {
    const role = msg.agent_role;
    const content = msg.parsed;

    if (role === 'student') {
      return (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={s.agentLabel}>You</div>
          <div style={s.msgBubble('student')}>{typeof content === 'string' ? content : JSON.stringify(content)}</div>
        </div>
      );
    }

    if (role === 'tutor' && typeof content === 'object') {
      return (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={s.agentLabel}>🤖 AI Tutor</div>
          <div style={s.msgBubble('tutor')}>
            <div style={{ marginBottom: content.example ? 10 : 0 }}>{content.explanation}</div>
            {content.example && <div style={{ fontSize: 13, padding: '8px 12px', background: '#ebf8ff', borderRadius: 6, color: '#2c5282', borderLeft: '3px solid #667eea' }}>Example: {content.example}</div>}
            {content.follow_up_question && <div style={s.followUp}>💭 {content.follow_up_question}</div>}
          </div>
        </div>
      );
    }

    return (
      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <div style={s.agentLabel}>{role}</div>
        <div style={s.msgBubble('tutor')}>{typeof content === 'string' ? content : JSON.stringify(content)}</div>
      </div>
    );
  };

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <Link to="/" style={s.backLink}>← Dashboard</Link>
        {session && <span style={s.topicBadge}>{session.topic}</span>}
        {session && <span style={{ fontSize: 13, color: '#718096' }}>{session.difficulty}</span>}
      </nav>

      <div style={s.main}>
        {/* Chat */}
        <div style={s.chatCol}>
          <div style={s.chatHeader}>
            <span>🎓</span>
            <span>Classroom Chat</span>
            {loading && <span style={{ fontSize: 12, color: '#718096', marginLeft: 'auto' }}>Tutor is thinking...</span>}
          </div>

          <div style={s.messages}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#718096' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>👋</div>
                <div>Start by asking about <strong>{session?.topic}</strong></div>
              </div>
            )}
            {messages.map(renderMessage)}
            {loading && <div style={s.loader}>⏳ Tutor is composing a response...</div>}
            {error && <div style={s.error}>{error}</div>}
            <div ref={messagesEnd} />
          </div>

          <form onSubmit={sendMessage} style={s.inputRow}>
            <textarea
              style={s.textInput}
              rows={2}
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
              placeholder="Ask your tutor anything... (Enter to send)"
              disabled={loading}
            />
            <button style={s.sendBtn} type="submit" disabled={loading || !message.trim()}>Send</button>
          </form>
        </div>

        {/* Side Panel */}
        <div style={s.sideCol}>
          <div style={s.sideCard}>
            <div style={s.sideTitle}>Actions</div>
            <button style={s.actionBtn('#48bb78')} onClick={startQuiz} disabled={quizLoading}>
              {quizLoading ? 'Generating Quiz...' : '📝 Start Quiz'}
            </button>
            <Link to={`/debate/${id}`} style={{ textDecoration: 'none' }}>
              <button style={s.actionBtn('#764ba2')}>⚖️ Socratic Debate</button>
            </Link>
            <Link to="/learning-path" style={{ textDecoration: 'none' }}>
              <button style={s.actionBtn('#ed8936')}>🗺️ Learning Path</button>
            </Link>
            <Link to="/progress" style={{ textDecoration: 'none' }}>
              <button style={{ ...s.actionBtn('#667eea'), marginBottom: 0 }}>📊 My Progress</button>
            </Link>
          </div>

          {/* Quiz Section */}
          {quiz && !quizResult && (
            <div style={s.sideCard}>
              <div style={s.sideTitle}>Quiz Time! ({quiz.length} questions)</div>
              {error && <div style={s.error}>{error}</div>}
              {quiz.map((q, qi) => (
                <div key={qi} style={s.question}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: '#2d3748' }}>
                    {qi + 1}. {q.question}
                  </div>
                  {q.options.map((opt, oi) => {
                    const letter = opt[0];
                    return (
                      <div
                        key={oi}
                        style={s.option(answers[qi] === letter, false, false)}
                        onClick={() => setAnswers(prev => ({ ...prev, [qi]: letter }))}
                      >
                        <span style={{ fontWeight: 700, color: '#667eea', minWidth: 18 }}>{letter}</span>
                        <span style={{ fontSize: 13 }}>{opt.slice(3)}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
              <button style={s.actionBtn('#667eea')} onClick={submitQuiz}>Submit Quiz</button>
            </div>
          )}

          {/* Quiz Results */}
          {quizResult && (
            <div style={s.sideCard}>
              <div style={s.sideTitle}>Quiz Results</div>
              <div style={s.scoreBox(quizResult.percentage)}>
                <div style={{ fontSize: 36, fontWeight: 800 }}>{quizResult.score}/{quizResult.max_score}</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{quizResult.percentage}% — Grade {quizResult.grade}</div>
              </div>
              {quizResult.feedback_per_question.map((fb, i) => (
                <div key={i} style={{ marginTop: 12, padding: '10px 14px', background: fb.is_correct ? '#f0fff4' : '#fff5f5', borderRadius: 8, fontSize: 13 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{i + 1}. {fb.is_correct ? '✅' : '❌'} {fb.question}</div>
                  {!fb.is_correct && <div style={{ color: '#c53030' }}>Your answer: {fb.student_answer} | Correct: {fb.correct_answer}</div>}
                  <div style={{ color: '#4a5568', marginTop: 4 }}>{fb.explanation}</div>
                </div>
              ))}
              <button style={{ ...s.actionBtn('#48bb78'), marginTop: 16, marginBottom: 0 }} onClick={startQuiz}>Try Again</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
