// Apply pass 5: Teacher dashboard / curriculum / assignments / grade reports / parent links.
// PRODUCT-DECISION: Single-tenant role model (req.user is the teacher; student_id refers to a user row).
// All tables are created via CREATE TABLE IF NOT EXISTS in db.js (additive only).
const express = require('express');
const router = express.Router();

// ----- Curriculum modules -----
router.get('/curriculum', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const r = await pool.query(
      'SELECT * FROM curriculum_modules WHERE teacher_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ data: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/curriculum', async (req, res) => {
  const { pool } = req.app.locals;
  const { title, subject, description, difficulty } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title is required' });
  try {
    const r = await pool.query(
      `INSERT INTO curriculum_modules (teacher_id, title, subject, description, difficulty)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, title, subject || null, description || null, difficulty || 'intermediate']
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/curriculum/:id', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    await pool.query('DELETE FROM curriculum_modules WHERE id = $1 AND teacher_id = $2', [req.params.id, req.user.id]);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ----- Assignments -----
router.get('/assignments', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const r = await pool.query(
      'SELECT * FROM assignments WHERE teacher_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ data: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/assignments', async (req, res) => {
  const { pool } = req.app.locals;
  const { title, instructions, module_id, due_at, max_score } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title is required' });
  try {
    const r = await pool.query(
      `INSERT INTO assignments (teacher_id, module_id, title, instructions, due_at, max_score)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, module_id || null, title, instructions || null, due_at || null, max_score || 100]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/assignments/:id/submissions', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const own = await pool.query(
      'SELECT 1 FROM assignments WHERE id = $1 AND teacher_id = $2',
      [req.params.id, req.user.id]
    );
    if (own.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const r = await pool.query(
      'SELECT * FROM assignment_submissions WHERE assignment_id = $1 ORDER BY submitted_at DESC',
      [req.params.id]
    );
    res.json({ data: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/assignments/:id/submit', async (req, res) => {
  // PRODUCT-DECISION: Same user can act as both teacher and student in this single-tenant model.
  const { pool } = req.app.locals;
  const { content } = req.body || {};
  if (!content) return res.status(400).json({ error: 'content is required' });
  try {
    const r = await pool.query(
      `INSERT INTO assignment_submissions (assignment_id, student_id, content)
       VALUES ($1, $2, $3)
       ON CONFLICT (assignment_id, student_id) DO UPDATE SET content = EXCLUDED.content, submitted_at = NOW()
       RETURNING *`,
      [req.params.id, req.user.id, content]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/submissions/:id/grade', async (req, res) => {
  const { pool } = req.app.locals;
  const { score, feedback } = req.body || {};
  try {
    const r = await pool.query(
      `UPDATE assignment_submissions SET score = $1, feedback = $2, graded_at = NOW()
       WHERE id = $3 AND assignment_id IN (SELECT id FROM assignments WHERE teacher_id = $4)
       RETURNING *`,
      [score || null, feedback || null, req.params.id, req.user.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Submission not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ----- Grade reports -----
router.get('/grade-reports', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const r = await pool.query(
      'SELECT * FROM grade_reports WHERE teacher_id = $1 ORDER BY created_at DESC LIMIT 100',
      [req.user.id]
    );
    res.json({ data: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ----- Parent links -----
router.get('/parent-links', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const r = await pool.query(
      `SELECT pl.* FROM parent_links pl
       WHERE pl.student_id = $1 OR pl.student_id IN (
         SELECT s.student_id FROM assignment_submissions s
         JOIN assignments a ON a.id = s.assignment_id WHERE a.teacher_id = $1
       )`,
      [req.user.id]
    );
    res.json({ data: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/parent-links', async (req, res) => {
  const { pool } = req.app.locals;
  const { parent_email, student_id, consent } = req.body || {};
  if (!parent_email || !student_id) return res.status(400).json({ error: 'parent_email and student_id are required' });
  try {
    const r = await pool.query(
      `INSERT INTO parent_links (parent_email, student_id, consent)
       VALUES ($1, $2, $3)
       ON CONFLICT (parent_email, student_id) DO UPDATE SET consent = EXCLUDED.consent
       RETURNING *`,
      [parent_email, student_id, !!consent]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ----- Teacher dashboard summary -----
router.get('/dashboard', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const counts = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM curriculum_modules WHERE teacher_id = $1) AS modules,
         (SELECT COUNT(*) FROM assignments WHERE teacher_id = $1) AS assignments,
         (SELECT COUNT(*) FROM assignment_submissions s
            JOIN assignments a ON a.id = s.assignment_id WHERE a.teacher_id = $1) AS submissions,
         (SELECT COUNT(*) FROM assignment_submissions s
            JOIN assignments a ON a.id = s.assignment_id WHERE a.teacher_id = $1 AND s.score IS NULL) AS ungraded`,
      [req.user.id]
    );
    res.json({ counts: counts.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
