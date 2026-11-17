const db = require('../database/db');

exports.listByHackathon = async (req, res, next) => {
  try {
    const hackathonId = Number(req.params.hackathonId);
    const [hackathons] = await db.query('SELECT id FROM hackathons WHERE id = ?', [hackathonId]);
    if (hackathons.length === 0) {
      return res.status(404).json({ message: 'Hackathon not found.' });
    }

    const [announcements] = await db.query(
      `SELECT a.id, a.hackathon_id, a.author_id, u.name AS author_name,
              a.title, a.message, a.created_at
       FROM announcements a
       JOIN users u ON u.id = a.author_id
       WHERE a.hackathon_id = ?
       ORDER BY a.created_at DESC, a.id DESC`,
      [hackathonId]
    );

    res.status(200).json({ announcements });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const hackathonId = Number(req.params.hackathonId);
    const [hackathons] = await db.query(
      'SELECT id, organiser_id FROM hackathons WHERE id = ?',
      [hackathonId]
    );
    const hackathon = hackathons[0];
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found.' });
    }
    if (req.user.role !== 'admin' && Number(hackathon.organiser_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'You can only announce for your own hackathons.' });
    }

    const { title, message } = req.body;
    const [result] = await db.query(
      'INSERT INTO announcements (hackathon_id, author_id, title, message) VALUES (?, ?, ?, ?)',
      [hackathonId, req.user.id, title.trim(), message.trim()]
    );
    const [announcements] = await db.query(
      `SELECT a.id, a.hackathon_id, a.author_id, u.name AS author_name,
              a.title, a.message, a.created_at
       FROM announcements a
       JOIN users u ON u.id = a.author_id
       WHERE a.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ announcement: announcements[0] });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const hackathonId = Number(req.params.hackathonId);
    const announcementId = Number(req.params.announcementId);
    const [announcements] = await db.query(
      'SELECT id, author_id FROM announcements WHERE id = ? AND hackathon_id = ?',
      [announcementId, hackathonId]
    );
    const announcement = announcements[0];
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found.' });
    }
    if (req.user.role !== 'admin' && Number(announcement.author_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'You can only delete your own announcements.' });
    }

    await db.query('DELETE FROM announcements WHERE id = ?', [announcementId]);
    res.status(200).json({ message: 'Announcement deleted.' });
  } catch (err) {
    next(err);
  }
};