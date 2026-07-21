const { Pool } = require('pg');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const initDB = async () => {
  const required = await pool.query("SELECT to_regclass('public.users') AS users, to_regclass('public.classroom_sessions') AS sessions");
  if (!required.rows[0]?.users || !required.rows[0]?.sessions) {
    throw new Error('Database schema is missing; apply backend/migrations explicitly before startup');
  }
  console.log('Database schema verified (read-only startup check)');
};

module.exports = { pool, initDB };
