const db = require('../database/db');

exports.getMyNotifications = async (req, res, next) => {
  try {
    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Math.min(Math.max(Number.isNaN(parsedLimit) ? 20 : parsedLimit, 1), 50);
    const [rows] = await db.query(
      `SELECT id, message, link, is_read, created_at
       FROM notifications WHERE user_id = ?
       ORDER BY created_at DESC, id DESC LIMIT ?`,
      [req.user.id, limit]
    );
    const [[{ unread }]] = await db.query(
      'SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.status(200).json({ unread: Number(unread), notifications: rows });
  } catch (err) {
    next(err);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Notification not found.' });
    await db.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.status(200).json({ message: 'Marked as read.' });
  } catch (err) {
    next(err);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.status(200).json({ message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
};