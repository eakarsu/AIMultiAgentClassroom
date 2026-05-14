const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_classroom',
});

const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'student',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS classroom_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      topic VARCHAR(500) NOT NULL,
      subject VARCHAR(255),
      difficulty VARCHAR(50) DEFAULT 'intermediate',
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS session_messages (
      id SERIAL PRIMARY KEY,
      session_id INTEGER REFERENCES classroom_sessions(id) ON DELETE CASCADE,
      agent_role VARCHAR(100),
      content TEXT NOT NULL,
      message_type VARCHAR(50) DEFAULT 'teaching',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS student_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      topic VARCHAR(500) NOT NULL,
      mastery_score INTEGER DEFAULT 0,
      sessions_completed INTEGER DEFAULT 0,
      last_assessed TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, topic)
    );

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      session_id INTEGER REFERENCES classroom_sessions(id) ON DELETE SET NULL,
      questions JSONB,
      answers JSONB,
      score INTEGER,
      max_score INTEGER,
      completed_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Apply pass 5 additions: teacher dashboard, assignments, curriculum,
    -- grade reports, parent communication. PRODUCT-DECISION: tenant model
    -- remains single-user; teacher_id is a self-link to users(id).
    CREATE TABLE IF NOT EXISTS curriculum_modules (
      id SERIAL PRIMARY KEY,
      teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL,
      subject VARCHAR(255),
      description TEXT,
      difficulty VARCHAR(50) DEFAULT 'intermediate',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id SERIAL PRIMARY KEY,
      teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      module_id INTEGER REFERENCES curriculum_modules(id) ON DELETE SET NULL,
      title VARCHAR(500) NOT NULL,
      instructions TEXT,
      due_at TIMESTAMP,
      max_score INTEGER DEFAULT 100,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id SERIAL PRIMARY KEY,
      assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
      student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      content TEXT,
      score INTEGER,
      feedback TEXT,
      submitted_at TIMESTAMP DEFAULT NOW(),
      graded_at TIMESTAMP,
      UNIQUE(assignment_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS grade_reports (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      period VARCHAR(64),
      payload JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS parent_links (
      id SERIAL PRIMARY KEY,
      parent_email VARCHAR(255) NOT NULL,
      student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      consent BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(parent_email, student_id)
    );
  `);
  console.log('Database initialized');
};

module.exports = { pool, initDB };
