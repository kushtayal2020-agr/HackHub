const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcrypt');
const db = require('../database/db');

const SALT_ROUNDS = 10;

async function createAdmin() {
  const args = process.argv.slice(2);
  const name = args[0] || 'System Administrator';
  const email = args[1] || 'admin@hackhub.test';
  const password = args[2] || 'Admin@1234';

  console.log(`Setting up admin account for: ${email}`);

  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) {
    await db.query(
      'UPDATE users SET name = ?, password_hash = ?, role = "admin", is_approved = 1, is_blocked = 0 WHERE email = ?',
      [name, hash, email]
    );
    console.log(`Updated existing user ${email} to admin role.`);
  } else {
    const [result] = await db.query(
      'INSERT INTO users (name, email, password_hash, role, is_approved, is_blocked) VALUES (?, ?, ?, "admin", 1, 0)',
      [name, email, hash]
    );
    console.log(`Created new admin user with ID ${result.insertId}.`);
  }

  // Close connection pool
  if (db.pool && typeof db.pool.end === 'function') {
    await db.pool.end();
  }
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error('Failed to create admin:', err.message);
  process.exit(1);
});
