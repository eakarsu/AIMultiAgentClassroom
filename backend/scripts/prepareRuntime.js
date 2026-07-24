const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

async function main() {
  const migrationDirectory = path.join(__dirname, '..', 'migrations');
  for (const name of fs.readdirSync(migrationDirectory).filter((item) => item.endsWith('.sql')).sort()) {
    await pool.query(fs.readFileSync(path.join(migrationDirectory, name), 'utf8'));
  }
  const email = process.env.PROVISION_ADMIN_EMAIL;
  const password = process.env.PROVISION_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Runtime administrator credentials are required');
  await pool.query(
    `INSERT INTO users(email,password,role) VALUES($1,$2,'admin')
     ON CONFLICT(email) DO UPDATE SET password=EXCLUDED.password,role=EXCLUDED.role`,
    [email.toLowerCase(), await bcrypt.hash(password, 10)],
  );
  await pool.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
