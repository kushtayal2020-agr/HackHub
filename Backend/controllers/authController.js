const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

const SALT_ROUNDS = 10;

function makeToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
}

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, college } = req.body;

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    // Organisers must be approved by the admin before they can log in
    const isApproved = role === 'organiser' ? 0 : 1;

    const [result] = await db.query(
      'INSERT INTO users (name, email, password_hash, role, college, is_approved) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hash, role, college || null, isApproved]
    );

    const message = isApproved
      ? 'Registration successful. Please log in.'
      : 'Registration successful. Your organiser account is waiting for admin approval.';
    res.status(201).json({ message, userId: result.insertId });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];
    // Same message for wrong email and wrong password, so attackers learn nothing
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    if (user.is_blocked) return res.status(403).json({ message: 'Your account is blocked.' });
    if (!user.is_approved) {
      return res.status(403).json({ message: 'Your account is waiting for admin approval.' });
    }

    res.status(200).json({
      message: 'Login successful.',
      token: makeToken(user),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me  (protected)
exports.me = async (req, res) => {
  res.status(200).json({ user: req.user });
};
