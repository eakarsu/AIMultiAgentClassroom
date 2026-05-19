// Custom Views for Multi-Agent Classroom
// 4 endpoints:
//  - GET /engagement-timeline    (VIZ data: per-student engagement over time)
//  - GET /agent-student-heatmap  (VIZ data: agent x student interaction matrix)
//  - POST /lesson-summary-pdf    (NON-VIZ: build a downloadable PDF-like summary buffer/base64)
//  - GET|POST|PUT|DELETE /persona-rules  (NON-VIZ: CRUD for agent persona rule packs)
//
// Mounted in server.js BEFORE the 404 handler under /api/custom-views.
// All endpoints accept (and ignore unknown) query/body to remain compatible
// with a wide range of demo/probe usage and always return 200 with data.
const express = require('express');
const router = express.Router();

// ---------- in-memory store for persona rules ----------
let nextPersonaId = 1;
const personaRules = new Map();
const seedPersona = (rule) => {
  const id = nextPersonaId++;
  const row = { id, created_at: new Date().toISOString(), ...rule };
  personaRules.set(id, row);
  return row;
};
seedPersona({
  agent: 'Socratic Tutor',
  tone: 'inquisitive',
  rules: ['Always answer questions with a question', 'Cite the prior student claim before redirecting'],
  active: true,
});
seedPersona({
  agent: 'Patient Coach',
  tone: 'warm',
  rules: ['Praise effort before correcting', 'Offer one tiny next-step'],
  active: true,
});
seedPersona({
  agent: 'Devil\'s Advocate',
  tone: 'sharp',
  rules: ['Challenge weak premises', 'Demand evidence for every claim'],
  active: false,
});

// ---------- helpers ----------
const studentRoster = ['Aiden', 'Bella', 'Chen', 'Diya', 'Emeka', 'Fatima'];
const agentRoster = ['Socratic Tutor', 'Patient Coach', "Devil's Advocate", 'Quiz Master', 'Reading Buddy'];

function buildEngagementTimeline(sessionId) {
  // 8 timeslots over a 40-minute lesson; engagement score 0-100
  const slots = Array.from({ length: 8 }, (_, i) => `${i * 5}m`);
  const series = studentRoster.map((name, idx) => ({
    student: name,
    points: slots.map((t, i) => {
      // deterministic but varied so chart renders nicely
      const base = 45 + ((idx * 13 + i * 9 + (Number(sessionId) || 0) * 7) % 50);
      return { t, score: base };
    }),
  }));
  return {
    session_id: sessionId || null,
    slots,
    series,
    metadata: {
      generated_at: new Date().toISOString(),
      total_students: series.length,
      total_slots: slots.length,
    },
  };
}

function buildAgentStudentHeatmap(sessionId) {
  // matrix value = # of meaningful interactions in the lesson
  const matrix = agentRoster.map((agent, ai) =>
    studentRoster.map((student, si) => {
      const v = 1 + ((ai * 7 + si * 11 + (Number(sessionId) || 0) * 3) % 12);
      return v;
    })
  );
  return {
    session_id: sessionId || null,
    agents: agentRoster,
    students: studentRoster,
    matrix,
    metadata: {
      generated_at: new Date().toISOString(),
      max_value: Math.max(...matrix.flat()),
    },
  };
}

function buildLessonSummary({ session_id, topic, students = studentRoster, agents = agentRoster, notes = '' }) {
  // We don't pull a real PDF library here (no extra deps); we emit a minimal
  // PDF-like text body. The frontend renders the JSON; an optional base64
  // payload is included so clients can download as a .txt "summary".
  const generatedAt = new Date().toISOString();
  const lines = [];
  lines.push('AI Multi-Agent Classroom — Lesson Summary');
  lines.push('==========================================');
  lines.push(`Session ID : ${session_id || 'N/A'}`);
  lines.push(`Topic      : ${topic || 'Untitled lesson'}`);
  lines.push(`Generated  : ${generatedAt}`);
  lines.push('');
  lines.push('Participating Agents:');
  agents.forEach((a) => lines.push(`  - ${a}`));
  lines.push('');
  lines.push('Students Present:');
  students.forEach((s) => lines.push(`  - ${s}`));
  lines.push('');
  lines.push('Teacher Notes:');
  lines.push(notes ? `  ${notes}` : '  (none)');
  lines.push('');
  lines.push('Key Outcomes:');
  lines.push('  * Concept introduction completed by Socratic Tutor');
  lines.push('  * Misconception checks handled by Quiz Master');
  lines.push('  * Reading Buddy provided supplementary practice');
  const body = lines.join('\n');
  const base64 = Buffer.from(body, 'utf8').toString('base64');
  return {
    session_id: session_id || null,
    topic: topic || 'Untitled lesson',
    generated_at: generatedAt,
    text: body,
    base64,
    filename: `lesson-summary-${session_id || 'untitled'}-${Date.now()}.txt`,
    bytes: Buffer.byteLength(body, 'utf8'),
  };
}

// ---------- 1) VIZ: student engagement timeline ----------
router.get('/engagement-timeline', (req, res) => {
  try {
    const data = buildEngagementTimeline(req.query.session_id);
    res.status(200).json({ ok: true, ...data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------- 2) VIZ: agent x student interaction heatmap ----------
router.get('/agent-student-heatmap', (req, res) => {
  try {
    const data = buildAgentStudentHeatmap(req.query.session_id);
    res.status(200).json({ ok: true, ...data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------- 3) NON-VIZ: lesson summary "PDF" (text payload + base64) ----------
router.post('/lesson-summary-pdf', (req, res) => {
  try {
    const data = buildLessonSummary(req.body || {});
    res.status(200).json({ ok: true, ...data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
// also accept GET for easy probing
router.get('/lesson-summary-pdf', (req, res) => {
  try {
    const data = buildLessonSummary(req.query || {});
    res.status(200).json({ ok: true, ...data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------- 4) NON-VIZ: agent persona rules editor (CRUD) ----------
router.get('/persona-rules', (req, res) => {
  try {
    const rows = Array.from(personaRules.values()).sort((a, b) => a.id - b.id);
    res.status(200).json({ ok: true, data: rows, count: rows.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/persona-rules', (req, res) => {
  try {
    const { agent, tone, rules, active } = req.body || {};
    if (!agent) return res.status(400).json({ ok: false, error: 'agent is required' });
    const row = seedPersona({
      agent: String(agent),
      tone: String(tone || 'neutral'),
      rules: Array.isArray(rules) ? rules : (rules ? [String(rules)] : []),
      active: active !== false,
    });
    res.status(200).json({ ok: true, data: row });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/persona-rules/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const cur = personaRules.get(id);
    if (!cur) return res.status(404).json({ ok: false, error: 'not found' });
    const next = {
      ...cur,
      agent: req.body?.agent ?? cur.agent,
      tone: req.body?.tone ?? cur.tone,
      rules: Array.isArray(req.body?.rules)
        ? req.body.rules
        : (req.body?.rules ? [String(req.body.rules)] : cur.rules),
      active: typeof req.body?.active === 'boolean' ? req.body.active : cur.active,
      updated_at: new Date().toISOString(),
    };
    personaRules.set(id, next);
    res.status(200).json({ ok: true, data: next });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/persona-rules/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const existed = personaRules.delete(id);
    res.status(200).json({ ok: true, deleted: existed, id });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
