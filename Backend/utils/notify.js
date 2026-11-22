const db = require('../database/db');

exports.createNotification = async (userId, message, link = null) => {
  await db.query(
    'INSERT INTO notifications (user_id, message, link) VALUES (?, ?, ?)',
    [userId, String(message).slice(0, 255), link]
  );
};

exports.notifyHackathonParticipants = async (hackathonId, message, link = null) => {
  await db.query(
    `INSERT INTO notifications (user_id, message, link)
     SELECT DISTINCT user_id, ?, ? FROM team_members WHERE hackathon_id = ?`,
    [String(message).slice(0, 255), link, hackathonId]
  );
};
