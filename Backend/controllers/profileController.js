const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const db = require('../database/db');
const { logAction, ACTIONS } = require('../utils/audit');

const SALT_ROUNDS = 10;

// GET /api/profile
exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      'SELECT id, name, email, role, college, skills, github_url, avatar_path, is_approved, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PUT /api/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, college, skills, github_url } = req.body;

    if (!name || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ message: 'Name must be between 2 and 100 characters.' });
    }

    const cleanCollege = college ? college.trim().slice(0, 150) : null;
    const cleanSkills = skills ? skills.trim().slice(0, 255) : null;
    const cleanGithub = github_url ? github_url.trim().slice(0, 255) : null;

    await db.query(
      'UPDATE users SET name = ?, college = ?, skills = ?, github_url = ? WHERE id = ?',
      [name.trim(), cleanCollege, cleanSkills, cleanGithub, userId]
    );

    logAction(req, ACTIONS.PROFILE_UPDATED, `User ${userId} updated profile`);

    const [rows] = await db.query(
      'SELECT id, name, email, role, college, skills, github_url, avatar_path, is_approved, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.status(200).json({
      message: 'Profile updated successfully.',
      user: rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/profile/avatar
exports.updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please select an image file to upload.' });
    }

    const userId = req.user.id;
    const avatarRelPath = `uploads/avatars/${req.file.filename}`;

    // Optional: remove old avatar file if not default
    const [rows] = await db.query('SELECT avatar_path FROM users WHERE id = ?', [userId]);
    if (rows.length > 0 && rows[0].avatar_path) {
      const oldPath = path.join(__dirname, '..', rows[0].avatar_path);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (e) {
          // ignore unlink error
        }
      }
    }

    await db.query('UPDATE users SET avatar_path = ? WHERE id = ?', [avatarRelPath, userId]);

    logAction(req, ACTIONS.PROFILE_UPDATED, `User ${userId} updated avatar`);

    res.status(200).json({
      message: 'Avatar updated successfully.',
      avatar_path: avatarRelPath,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/profile/password
exports.changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current password and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
    }

    // Must have at least 1 letter and 1 digit
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ message: 'Password must include at least one letter and one number.' });
    }

    const [rows] = await db.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);

    logAction(req, ACTIONS.PASSWORD_CHANGED, `User ${userId} updated password`);

    res.status(200).json({ message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
};
