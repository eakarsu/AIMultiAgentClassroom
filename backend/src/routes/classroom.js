const express = require('express');
const router = express.Router();

// POST /api/classroom/sessions - create new session
router.post('/sessions', async (req, res) => {
  const { pool } = req.app.locals;
  const { topic, subject, difficulty } = req.body;
  const user_id = req.user.id;

  if (!topic) {
    return res.status(400).json({ error: 'topic is required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO classroom_sessions (user_id, topic, subject, difficulty) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, topic, subject || null, difficulty || 'intermediate']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/classroom/sessions - list user sessions (paginated)
router.get('/sessions', async (req, res) => {
  const { pool } = req.app.locals;
  const user_id = req.user.id;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const offset = (page - 1) * limit;
  const { status } = req.query;

  try {
    let base = 'FROM classroom_sessions WHERE user_id = $1';
    const params = [user_id];
    if (status) {
      base += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    const countRes = await pool.query(`SELECT COUNT(*) ${base}`, params);
    const total = parseInt(countRes.rows[0].count);

    const dataParams = [...params, limit, offset];
    const dataRes = await pool.query(
      `SELECT cs.*,
        (SELECT COUNT(*) FROM session_messages WHERE session_id = cs.id) as message_count,
        (SELECT COUNT(*) FROM quiz_attempts WHERE session_id = cs.id) as quiz_count
       ${base} ORDER BY cs.created_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    res.json({
      data: dataRes.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/classroom/sessions/:id - get session detail
router.get('/sessions/:id', async (req, res) => {
  const { pool } = req.app.locals;
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      'SELECT * FROM classroom_sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, user_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/classroom/sessions/:id/messages - get session messages
router.get('/sessions/:id/messages', async (req, res) => {
  const { pool } = req.app.locals;
  const user_id = req.user.id;

  try {
    // Verify ownership
    const session = await pool.query(
      'SELECT id FROM classroom_sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, user_id]
    );
    if (session.rows.length === 0) return res.status(404).json({ error: 'Session not found' });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const countRes = await pool.query('SELECT COUNT(*) FROM session_messages WHERE session_id = $1', [req.params.id]);
    const total = parseInt(countRes.rows[0].count);

    const messages = await pool.query(
      'SELECT * FROM session_messages WHERE session_id = $1 ORDER BY created_at ASC LIMIT $2 OFFSET $3',
      [req.params.id, limit, offset]
    );

    res.json({
      data: messages.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/classroom/sessions/:id/status - update session status
router.patch('/sessions/:id/status', async (req, res) => {
  const { pool } = req.app.locals;
  const { status } = req.body;
  const valid = ['active', 'completed', 'paused'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
  }

  try {
    const result = await pool.query(
      'UPDATE classroom_sessions SET status = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [status, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
