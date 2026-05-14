const express = require('express');
const router = express.Router();
const https = require('https');

// OpenRouter helper
const callOpenRouter = (systemPrompt, userPrompt) => {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4000,
      temperature: 0.7,
    });

    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
        'X-Title': 'AI Multi-Agent Classroom',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.choices && parsed.choices[0]) {
            resolve(parsed.choices[0].message.content);
          } else if (parsed.error) {
            reject(new Error(parsed.error.message || 'OpenRouter API error'));
          } else {
            reject(new Error('Unexpected API response'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

const parseJSON = (text) => {
  try {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    if (match) return JSON.parse(match[1]);
    return JSON.parse(text);
  } catch {
    return null;
  }
};

// POST /api/ai/tutor-response
// Agent: TUTOR — patient, Socratic, domain expert
router.post('/tutor-response', async (req, res) => {
  const { pool } = req.app.locals;
  const { sessionId, studentMessage } = req.body;
  const user_id = req.user.id;

  if (!sessionId || !studentMessage) {
    return res.status(400).json({ error: 'sessionId and studentMessage are required' });
  }

  try {
    const sessionRes = await pool.query(
      'SELECT * FROM classroom_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, user_id]
    );
    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found' });

    const session = sessionRes.rows[0];

    // Save student message
    await pool.query(
      'INSERT INTO session_messages (session_id, agent_role, content, message_type) VALUES ($1, $2, $3, $4)',
      [sessionId, 'student', studentMessage, 'question']
    );

    // Get recent conversation history (last 6 messages)
    const historyRes = await pool.query(
      'SELECT agent_role, content FROM session_messages WHERE session_id = $1 ORDER BY created_at DESC LIMIT 6',
      [sessionId]
    );
    const history = historyRes.rows.reverse().map(m => `[${m.agent_role}]: ${m.content}`).join('\n');

    const systemPrompt = `You are a patient, encouraging AI tutor teaching "${session.topic}" at ${session.difficulty} level.
Your teaching style:
- Break down complex concepts into digestible pieces
- Use real-world examples and analogies
- Ask follow-up questions to check understanding
- Celebrate student progress and correct mistakes gently
- Build on prior conversation context

Always return valid JSON in this exact format:
{
  "explanation": "clear explanation of the concept",
  "example": "concrete real-world example",
  "follow_up_question": "a question to check understanding",
  "concept_reinforced": "the key concept being taught"
}`;

    const userPrompt = `Topic: ${session.topic}
Subject: ${session.subject || 'General'}
Difficulty: ${session.difficulty}

Recent conversation:
${history}

Student's latest message: "${studentMessage}"

Respond as the tutor. Return JSON only.`;

    const response = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseJSON(response) || {
      explanation: response,
      example: '',
      follow_up_question: 'Does that make sense? What would you like to explore further?',
      concept_reinforced: session.topic,
    };

    // Save tutor response
    const saved = await pool.query(
      'INSERT INTO session_messages (session_id, agent_role, content, message_type) VALUES ($1, $2, $3, $4) RETURNING *',
      [sessionId, 'tutor', JSON.stringify(parsed), 'teaching']
    );

    // Update student progress
    await pool.query(`
      INSERT INTO student_progress (user_id, topic, sessions_completed, last_assessed)
      VALUES ($1, $2, 1, NOW())
      ON CONFLICT (user_id, topic) DO UPDATE
        SET sessions_completed = student_progress.sessions_completed + 1,
            last_assessed = NOW()
    `, [user_id, session.topic]);

    res.json({ ...parsed, messageId: saved.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/quiz-master
// Agent: QUIZ MASTER — generates 5 quiz questions
router.post('/quiz-master', async (req, res) => {
  const { pool } = req.app.locals;
  const { sessionId, topic } = req.body;
  const user_id = req.user.id;

  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

  try {
    const sessionRes = await pool.query(
      'SELECT * FROM classroom_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, user_id]
    );
    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found' });

    const session = sessionRes.rows[0];
    const quizTopic = topic || session.topic;

    const systemPrompt = `You are a rigorous but fair Quiz Master. Generate exactly 5 multiple-choice questions to test understanding of the given topic.
Each question must have 4 options (A, B, C, D), one correct answer, and an explanation.
Return valid JSON in this exact format:
{
  "questions": [
    {
      "question": "question text",
      "options": ["A. option", "B. option", "C. option", "D. option"],
      "correct_answer": "A",
      "explanation": "why this is the correct answer"
    }
  ]
}`;

    const userPrompt = `Generate 5 quiz questions for the topic: "${quizTopic}" at ${session.difficulty} difficulty level.
Cover different aspects of the topic. Return JSON only.`;

    const response = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseJSON(response);

    if (!parsed || !parsed.questions) {
      return res.status(500).json({ error: 'Failed to generate quiz questions' });
    }

    // Save quiz attempt (questions only, answers null until graded)
    const attempt = await pool.query(
      'INSERT INTO quiz_attempts (user_id, session_id, questions, max_score) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, sessionId, JSON.stringify(parsed.questions), parsed.questions.length]
    );

    // Save as session message
    await pool.query(
      'INSERT INTO session_messages (session_id, agent_role, content, message_type) VALUES ($1, $2, $3, $4)',
      [sessionId, 'quiz_master', JSON.stringify(parsed), 'quiz']
    );

    res.json({
      attemptId: attempt.rows[0].id,
      questions: parsed.questions,
      topic: quizTopic,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/grade-quiz
// Agent: GRADER — evaluates answers and provides feedback
router.post('/grade-quiz', async (req, res) => {
  const { pool } = req.app.locals;
  const { attemptId, answers } = req.body;
  const user_id = req.user.id;

  if (!attemptId || !answers) {
    return res.status(400).json({ error: 'attemptId and answers are required' });
  }

  try {
    const attemptRes = await pool.query(
      'SELECT * FROM quiz_attempts WHERE id = $1 AND user_id = $2',
      [attemptId, user_id]
    );
    if (attemptRes.rows.length === 0) return res.status(404).json({ error: 'Quiz attempt not found' });

    const attempt = attemptRes.rows[0];
    const questions = typeof attempt.questions === 'string'
      ? JSON.parse(attempt.questions)
      : attempt.questions;

    let score = 0;
    const feedback = questions.map((q, i) => {
      const studentAnswer = answers[i] || answers[String(i)];
      const correct = q.correct_answer;
      const isCorrect = studentAnswer && studentAnswer.trim().toUpperCase().startsWith(correct.toUpperCase());
      if (isCorrect) score++;
      return {
        question_index: i,
        question: q.question,
        student_answer: studentAnswer || 'Not answered',
        correct_answer: correct,
        is_correct: isCorrect,
        explanation: q.explanation,
      };
    });

    const maxScore = questions.length;
    const percentage = Math.round((score / maxScore) * 100);

    // Save graded attempt
    await pool.query(
      'UPDATE quiz_attempts SET answers = $1, score = $2, max_score = $3, completed_at = NOW() WHERE id = $4',
      [JSON.stringify(answers), score, maxScore, attemptId]
    );

    // Update mastery score in student_progress
    const sessionRes = await pool.query('SELECT topic FROM classroom_sessions WHERE id = $1', [attempt.session_id]);
    if (sessionRes.rows.length > 0) {
      const topic = sessionRes.rows[0].topic;
      await pool.query(`
        INSERT INTO student_progress (user_id, topic, mastery_score, last_assessed)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id, topic) DO UPDATE
          SET mastery_score = GREATEST(student_progress.mastery_score, $3),
              last_assessed = NOW()
      `, [user_id, topic, percentage]);
    }

    res.json({
      score,
      max_score: maxScore,
      percentage,
      grade: percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'F',
      feedback_per_question: feedback,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/socratic-debate
// Agents: ADVOCATE + CRITIC + REFEREE — structured debate on a topic
router.post('/socratic-debate', async (req, res) => {
  const { pool } = req.app.locals;
  const { sessionId, position } = req.body;
  const user_id = req.user.id;

  if (!sessionId || !position) {
    return res.status(400).json({ error: 'sessionId and position are required' });
  }

  try {
    const sessionRes = await pool.query(
      'SELECT * FROM classroom_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, user_id]
    );
    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found' });

    const session = sessionRes.rows[0];

    const systemPrompt = `You are facilitating a Socratic debate with three AI agents:
- ADVOCATE: argues strongly FOR the position with evidence and logic
- CRITIC: argues strongly AGAINST with counter-evidence and alternative perspectives
- REFEREE: synthesizes both sides, identifies the key insights, and highlights where both sides agree

Return valid JSON in this exact format:
{
  "argument_for": "The ADVOCATE's 3-5 paragraph argument for the position, with specific examples",
  "argument_against": "The CRITIC's 3-5 paragraph argument against, with counter-examples",
  "referee_summary": "The REFEREE's 2-3 paragraph synthesis that identifies truth in both sides",
  "key_insights": ["insight 1", "insight 2", "insight 3"],
  "common_ground": "what both sides agree on"
}`;

    const userPrompt = `Topic: ${session.topic}
Position to debate: "${position}"
Debate at ${session.difficulty} intellectual level. Return JSON only.`;

    const response = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseJSON(response) || { argument_for: response, argument_against: '', referee_summary: '', key_insights: [] };

    // Save debate as session message
    await pool.query(
      'INSERT INTO session_messages (session_id, agent_role, content, message_type) VALUES ($1, $2, $3, $4)',
      [sessionId, 'debate_panel', JSON.stringify(parsed), 'debate']
    );

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/learning-path
// Agent: CURRICULUM DESIGNER — generates personalized learning path
router.post('/learning-path', async (req, res) => {
  const { pool } = req.app.locals;
  const { topic, currentLevel } = req.body;
  const user_id = req.user.id;

  if (!topic) return res.status(400).json({ error: 'topic is required' });

  try {
    // Get user's existing progress for context
    const progressRes = await pool.query(
      'SELECT topic, mastery_score, sessions_completed FROM student_progress WHERE user_id = $1 ORDER BY mastery_score DESC LIMIT 10',
      [user_id]
    );
    const priorKnowledge = progressRes.rows.map(p => `${p.topic} (mastery: ${p.mastery_score}%)`).join(', ');

    const systemPrompt = `You are an expert curriculum designer specializing in personalized learning paths.
Design a structured learning path with clearly sequenced modules that build on each other.
Return valid JSON in this exact format:
{
  "modules": [
    {
      "title": "module title",
      "description": "what the student will learn",
      "estimated_hours": 2,
      "prerequisites": ["prerequisite topic 1"],
      "learning_objectives": ["objective 1", "objective 2"],
      "resources": ["resource type or name"]
    }
  ],
  "total_estimated_hours": 20,
  "certification_available": true,
  "difficulty_progression": "description of how difficulty increases",
  "recommended_pace": "suggested weekly schedule"
}`;

    const userPrompt = `Create a personalized learning path for: "${topic}"
Current level: ${currentLevel || 'beginner'}
Student's prior knowledge areas: ${priorKnowledge || 'None on record'}
Return JSON only.`;

    const response = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseJSON(response) || { modules: [], total_estimated_hours: 0, certification_available: false };

    res.json({ topic, currentLevel: currentLevel || 'beginner', ...parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai/progress
// Returns student's mastery scores across all topics
router.get('/progress', async (req, res) => {
  const { pool } = req.app.locals;
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      `SELECT sp.*,
        (SELECT COUNT(*) FROM quiz_attempts WHERE user_id = $1 AND session_id IN (
          SELECT id FROM classroom_sessions WHERE user_id = $1 AND topic = sp.topic
        )) as quiz_attempts
       FROM student_progress sp
       WHERE sp.user_id = $1
       ORDER BY sp.last_assessed DESC`,
      [user_id]
    );

    const overall = result.rows.length > 0
      ? Math.round(result.rows.reduce((s, r) => s + r.mastery_score, 0) / result.rows.length)
      : 0;

    res.json({
      progress: result.rows,
      overall_mastery: overall,
      topics_studied: result.rows.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/misconception-detection
// Agent: DIAGNOSTICIAN — identifies student misunderstandings from recent messages
router.post('/misconception-detection', async (req, res) => {
  const { pool } = req.app.locals;
  const { sessionId } = req.body;
  const user_id = req.user.id;

  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

  try {
    const sessionRes = await pool.query(
      'SELECT * FROM classroom_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, user_id]
    );
    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    const session = sessionRes.rows[0];

    const historyRes = await pool.query(
      'SELECT agent_role, content FROM session_messages WHERE session_id = $1 ORDER BY created_at DESC LIMIT 20',
      [sessionId]
    );
    const history = historyRes.rows.reverse().map(m => `[${m.agent_role}]: ${m.content}`).join('\n');

    const systemPrompt = `You are a learning diagnostician. Identify student misconceptions from recent classroom messages and recommend targeted remediation.
Return valid JSON in this exact format:
{
  "misconceptions": [
    {
      "concept": "concept name",
      "evidence": "quoted student statement showing the misunderstanding",
      "correction": "the correct understanding",
      "remediation_activity": "what activity would best address this misconception"
    }
  ],
  "confidence": "low" | "medium" | "high",
  "next_steps": ["step 1", "step 2"]
}`;

    const userPrompt = `Topic: ${session.topic}
Difficulty: ${session.difficulty}

Recent classroom transcript:
${history}

Identify any student misconceptions and prescribe remediation. Return JSON only.`;

    const response = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseJSON(response) || { misconceptions: [], confidence: 'low', next_steps: [] };

    await pool.query(
      'INSERT INTO session_messages (session_id, agent_role, content, message_type) VALUES ($1, $2, $3, $4)',
      [sessionId, 'diagnostician', JSON.stringify(parsed), 'diagnosis']
    );

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/difficulty-adapt
// Agent: ADAPTIVE COACH — recommends difficulty adjustment based on mastery + recent quiz scores
router.post('/difficulty-adapt', async (req, res) => {
  const { pool } = req.app.locals;
  const { sessionId } = req.body;
  const user_id = req.user.id;

  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

  try {
    const sessionRes = await pool.query(
      'SELECT * FROM classroom_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, user_id]
    );
    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    const session = sessionRes.rows[0];

    const progressRes = await pool.query(
      'SELECT mastery_score, sessions_completed FROM student_progress WHERE user_id = $1 AND topic = $2',
      [user_id, session.topic]
    );
    const recentQuizzes = await pool.query(
      'SELECT score, max_score, completed_at FROM quiz_attempts WHERE user_id = $1 AND session_id = $2 ORDER BY completed_at DESC LIMIT 5',
      [user_id, sessionId]
    );

    const systemPrompt = `You are an adaptive learning coach. Decide whether to increase, hold, or decrease difficulty based on student mastery and recent quiz performance.
Return valid JSON in this exact format:
{
  "current_difficulty": string,
  "recommended_difficulty": "easier" | "same" | "harder",
  "rationale": string,
  "adjustments": [string],
  "next_lesson_focus": string
}`;

    const userPrompt = `Topic: ${session.topic}
Current difficulty: ${session.difficulty}
Mastery & history: ${JSON.stringify(progressRes.rows[0] || {})}
Recent quiz attempts: ${JSON.stringify(recentQuizzes.rows)}

Recommend an adaptation. Return JSON only.`;

    const response = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseJSON(response) || { current_difficulty: session.difficulty, recommended_difficulty: 'same', rationale: response };

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----- Apply pass 5 additions -----

// POST /api/ai/parent-communication
// MECHANICAL: Generate empathetic, accurate parent-friendly progress summary.
// Returns 503 + missing when OPENROUTER_API_KEY is unset.
router.post('/parent-communication', async (req, res) => {
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(503).json({ error: 'AI service not configured', missing: 'OPENROUTER_API_KEY' });
  }
  const { pool } = req.app.locals;
  const { studentId, period, tone } = req.body || {};
  const teacherId = req.user.id;
  if (!studentId) return res.status(400).json({ error: 'studentId is required' });

  try {
    const progress = await pool.query(
      'SELECT topic, mastery_score, sessions_completed, last_assessed FROM student_progress WHERE user_id = $1',
      [studentId]
    );
    const recentQuizzes = await pool.query(
      'SELECT score, max_score, completed_at FROM quiz_attempts WHERE user_id = $1 ORDER BY completed_at DESC LIMIT 10',
      [studentId]
    );

    const systemPrompt = `You are a teacher communicating with a parent. Produce a warm, accurate, specific message about the student's recent progress.
Return JSON:
{
  "subject": "string",
  "greeting": "string",
  "highlights": ["string"],
  "areas_to_improve": ["string"],
  "recommended_home_support": ["string"],
  "closing": "string",
  "full_message": "string"
}`;
    const userPrompt = `Period: ${period || 'recent'}\nTone: ${tone || 'warm, professional'}\nProgress rows: ${JSON.stringify(progress.rows)}\nRecent quizzes: ${JSON.stringify(recentQuizzes.rows)}`;
    const raw = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseJSON(raw) || { full_message: raw };
    res.json({ student_id: studentId, teacher_id: teacherId, generated_at: new Date().toISOString(), message: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/grade-summary
// MECHANICAL: AI summary of a student's grades for a given period.
router.post('/grade-summary', async (req, res) => {
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(503).json({ error: 'AI service not configured', missing: 'OPENROUTER_API_KEY' });
  }
  const { pool } = req.app.locals;
  const { studentId, period } = req.body || {};
  if (!studentId) return res.status(400).json({ error: 'studentId is required' });
  try {
    const subs = await pool.query(
      `SELECT s.score, s.feedback, s.submitted_at, a.title, a.max_score
       FROM assignment_submissions s
       JOIN assignments a ON a.id = s.assignment_id
       WHERE s.student_id = $1 ORDER BY s.submitted_at DESC LIMIT 50`,
      [studentId]
    );
    const systemPrompt = `You are an academic counselor. Summarize this student's grade record into JSON:
{
  "overall_grade_letter": "A|B|C|D|F",
  "average_pct": number,
  "trend": "up|flat|down",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "recommendations": ["string"],
  "summary": "string"
}`;
    const userPrompt = `Period: ${period || 'recent'}\nSubmissions:\n${JSON.stringify(subs.rows)}`;
    const raw = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseJSON(raw) || { summary: raw };
    // Persist
    try {
      await pool.query(
        'INSERT INTO grade_reports (student_id, teacher_id, period, payload) VALUES ($1, $2, $3, $4)',
        [studentId, req.user.id, period || 'recent', JSON.stringify(parsed)]
      );
    } catch (_) { /* non-fatal */ }
    res.json({ student_id: studentId, generated_at: new Date().toISOString(), summary: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
