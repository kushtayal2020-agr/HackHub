const db = require('../database/db');
const { notifyHackathonParticipants } = require('../utils/notify');
const { sendAnnouncementEmails } = require('../utils/emailService');

exports.createAnnouncement = async (req, res, next) => {
  try {
    const hackathonId = Number(req.params.id);
    const [hackathons] = await db.query(
      'SELECT id, title, organiser_id FROM hackathons WHERE id = ?',
      [hackathonId]
    );
    const hackathon = hackathons[0];
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found.' });
    }
    if (Number(hackathon.organiser_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'You can only post in your own hackathons.' });
    }

    const { title, message } = req.body;
    const [result] = await db.query(
      'INSERT INTO announcements (hackathon_id, author_id, title, message) VALUES (?, ?, ?, ?)',
      [hackathonId, req.user.id, title.trim(), message.trim()]
    );
    await notifyHackathonParticipants(
      hackathonId,
      `New announcement in ${hackathon.title}: ${title}`,
      `hackathon-detail.html?id=${hackathonId}`
    );
    sendAnnouncementEmails(hackathonId, title, message).catch((err) => {
      console.error('[mail] announcement email error:', err.message);
    });

    res.status(201).json({ message: 'Announcement posted.', id: result.insertId });
  } catch (err) {
    next(err);
  }
};

exports.getAnnouncements = async (req, res, next) => {
  try {
    const hackathonId = Number(req.params.id);
    const [hackathons] = await db.query(
      "SELECT id FROM hackathons WHERE id = ? AND approval_status = 'approved'",
      [hackathonId]
    );
    if (hackathons.length === 0) {
      return res.status(404).json({ message: 'Hackathon not found.' });
    }
    const [announcements] = await db.query(
      `SELECT a.id, a.title, a.message, a.created_at, u.name AS author
       FROM announcements a JOIN users u ON u.id = a.author_id
       WHERE a.hackathon_id = ? ORDER BY a.created_at DESC, a.id DESC`,
      [hackathonId]
    );
    res.status(200).json(announcements);
  } catch (err) {
    next(err);
  }
};

exports.deleteAnnouncement = async (req, res, next) => {
  try {
    const announcementId = Number(req.params.id);
    const [announcements] = await db.query(
      `SELECT a.id, h.organiser_id
       FROM announcements a JOIN hackathons h ON h.id = a.hackathon_id
       WHERE a.id = ?`,
      [announcementId]
    );
    const announcement = announcements[0];
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found.' });
    }
    if (
      Number(announcement.organiser_id) !== Number(req.user.id)
      && req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'You cannot delete this announcement.' });
    }

    await db.query('DELETE FROM announcements WHERE id = ?', [announcementId]);
    res.status(200).json({ message: 'Announcement deleted.' });
  } catch (err) {
    next(err);
  }
};