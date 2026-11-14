const jwt = require('jsonwebtoken');
const db = require('../database/db');

// Verifies the JWT and attaches the user to req.user
module.exports = async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Access denied. Please log in.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Re-check the user so blocked or deleted users lose access immediately
    const [rows] = await db.query(
      'SELECT id, name, email, role, is_blocked FROM users WHERE id = ?',
      [decoded.id]
    );
    if (rows.length === 0) return res.status(401).json({ message: 'User no longer exists.' });
    if (rows[0].is_blocked) return res.status(403).json({ message: 'Your account is blocked.' });

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
    }
    next(err);
  }
};
