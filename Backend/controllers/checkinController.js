const qrcode = require('qrcode');
const db = require('../database/db');
const { logAction, ACTIONS } = require('../utils/audit');

// GET /api/hackathons/:id/my-checkin-qr
exports.getMyCheckinQr = async (req, res, next) => {
  try {
    const hackathonId = Number(req.params.id);
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT tm.checkin_code, tm.checked_in, tm.checked_in_at,
              t.name AS team_name, h.title AS hackathon_title,
              u.name AS user_name, u.email AS user_email, u.college
       FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       JOIN hackathons h ON tm.hackathon_id = h.id
       JOIN users u ON tm.user_id = u.id
       WHERE tm.user_id = ? AND tm.hackathon_id = ?`,
      [userId, hackathonId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: 'You are not registered in any team for this hackathon.',
      });
    }

    const reg = rows[0];

    // Payload embedded inside QR code
    const payload = JSON.stringify({
      code: reg.checkin_code,
      userId,
      hackathonId,
    });

    // Generate high-resolution clean QR Data URL
    const qrCodeDataUrl = await qrcode.toDataURL(payload, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    res.status(200).json({
      qrCodeDataUrl,
      checkinCode: reg.checkin_code,
      checkedIn: !!reg.checked_in,
      checkedInAt: reg.checked_in_at,
      teamName: reg.team_name,
      hackathonTitle: reg.hackathon_title,
      userName: reg.user_name,
      userEmail: reg.user_email,
      college: reg.college,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/hackathons/:id/checkin
exports.checkinParticipant = async (req, res, next) => {
  try {
    const hackathonId = Number(req.params.id);
    const { checkinCode, userId } = req.body;

    if (!checkinCode && !userId) {
      return res.status(400).json({ message: 'Provide checkinCode or userId.' });
    }

    // Verify organiser ownership or admin
    if (req.user.role !== 'admin') {
      const [h] = await db.query('SELECT organiser_id FROM hackathons WHERE id = ?', [hackathonId]);
      if (h.length === 0 || h[0].organiser_id !== req.user.id) {
        return res.status(403).json({ message: 'Access denied. You do not manage this hackathon.' });
      }
    }

    let query = `
      SELECT tm.id, tm.checkin_code, tm.checked_in, tm.checked_in_at,
             u.id AS user_id, u.name, u.email, u.college, t.name AS team_name
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.hackathon_id = ?
    `;
    const params = [hackathonId];

    if (checkinCode) {
      query += ' AND tm.checkin_code = ?';
      params.push(String(checkinCode).trim());
    } else {
      query += ' AND tm.user_id = ?';
      params.push(Number(userId));
    }

    const [rows] = await db.query(query, params);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Participant registration not found for this hackathon.' });
    }

    const participant = rows[0];
    if (participant.checked_in) {
      return res.status(400).json({
        message: `Participant ${participant.name} is ALREADY checked in (at ${new Date(participant.checked_in_at).toLocaleTimeString()}).`,
        participant,
      });
    }

    const now = new Date();
    await db.query(
      'UPDATE team_members SET checked_in = 1, checked_in_at = ? WHERE id = ?',
      [now, participant.id]
    );

    logAction(
      req,
      ACTIONS.CHECKIN_COMPLETED,
      `Checked in ${participant.name} (${participant.email}) for hackathon ${hackathonId}`
    );

    res.status(200).json({
      message: `Check-in confirmed for ${participant.name}!`,
      participant: {
        id: participant.user_id,
        name: participant.name,
        email: participant.email,
        college: participant.college,
        teamName: participant.team_name,
        checkinCode: participant.checkin_code,
        checkedInAt: now,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/hackathons/:id/checkins
exports.getCheckinStats = async (req, res, next) => {
  try {
    const hackathonId = Number(req.params.id);

    // Verify organiser ownership or admin
    if (req.user.role !== 'admin') {
      const [h] = await db.query('SELECT organiser_id FROM hackathons WHERE id = ?', [hackathonId]);
      if (h.length === 0 || h[0].organiser_id !== req.user.id) {
        return res.status(403).json({ message: 'Access denied. You do not manage this hackathon.' });
      }
    }

    const [stats] = await db.query(
      `SELECT
        COUNT(*) AS total_registered,
        SUM(CASE WHEN checked_in = 1 THEN 1 ELSE 0 END) AS checked_in_count
       FROM team_members
       WHERE hackathon_id = ?`,
      [hackathonId]
    );

    const totalRegistered = stats[0].total_registered || 0;
    const checkedInCount = Number(stats[0].checked_in_count || 0);
    const pendingCount = totalRegistered - checkedInCount;
    const percentage = totalRegistered > 0 ? Math.round((checkedInCount / totalRegistered) * 100) : 0;

    // Recent checkins
    const [recent] = await db.query(
      `SELECT tm.id, tm.checked_in, tm.checked_in_at, tm.checkin_code,
              u.name AS user_name, u.email AS user_email, u.college,
              t.name AS team_name
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       JOIN teams t ON tm.team_id = t.id
       WHERE tm.hackathon_id = ?
       ORDER BY tm.checked_in DESC, tm.checked_in_at DESC, tm.joined_at ASC
       LIMIT 100`,
      [hackathonId]
    );

    res.status(200).json({
      totalRegistered,
      checkedInCount,
      pendingCount,
      percentage,
      records: recent,
    });
  } catch (err) {
    next(err);
  }
};
