const fs = require('fs');
const path = require('path');
const db = require('../database/db');
const { logAction, ACTIONS } = require('../utils/audit');

const STATUS_SQL = `(CASE
  WHEN h.results_published = 1 THEN 'completed'
  WHEN NOW() < h.start_date THEN 'upcoming'
  WHEN NOW() <= h.end_date THEN 'live'
  ELSE 'completed'
END)`;

const toSql = (value) => String(value)
  .replace('T', ' ')
  .replace(/(\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/, '')
  .slice(0, 19);

function readPage(value, fallback) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function nullable(value) {
  return value || null;
}

exports.createHackathon = async (req, res, next) => {
  try {
    const {
      title,
      description,
      theme,
      rules,
      prizes,
      registration_start: registrationStart,
      registration_end: registrationEnd,
      start_date: startDate,
      end_date: endDate,
      max_team_size: maxTeamSize,
    } = req.body;
    const bannerPath = req.file ? `uploads/banners/${req.file.filename}` : null;

    const [result] = await db.query(
      `INSERT INTO hackathons (
        organiser_id, title, description, theme, rules, prizes, banner_path,
        registration_start, registration_end, start_date, end_date, max_team_size
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        title.trim(),
        nullable(description),
        nullable(theme),
        nullable(rules),
        nullable(prizes),
        bannerPath,
        toSql(registrationStart),
        toSql(registrationEnd),
        toSql(startDate),
        toSql(endDate),
        maxTeamSize || 4,
      ]
    );

    logAction(req, ACTIONS.HACKATHON_CREATED, `ID: ${result.insertId}, Title: ${title.trim()}`);

    res.status(201).json({
      message: 'Hackathon created. It will appear after admin approval.',
      id: result.insertId,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllHackathons = async (req, res, next) => {
  try {
    const page = readPage(req.query.page, 1);
    const limit = Math.min(readPage(req.query.limit, 9), 50);
    const safePage = Math.min(page, Math.floor(Number.MAX_SAFE_INTEGER / limit));
    const offset = (safePage - 1) * limit;
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const theme = typeof req.query.theme === 'string' ? req.query.theme : '';
    const status = typeof req.query.status === 'string' ? req.query.status : '';

    let where = "WHERE h.approval_status = 'approved'";
    const params = [];
    if (search) {
      where += ' AND (h.title LIKE ? OR h.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (theme) {
      where += ' AND h.theme = ?';
      params.push(theme);
    }
    if (['upcoming', 'live', 'completed'].includes(status)) {
      where += ` AND ${STATUS_SQL} = ?`;
      params.push(status);
    }

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM hackathons h ${where}`,
      params
    );
    const [hackathons] = await db.query(
      `SELECT h.id, h.title, h.theme, h.prizes, h.banner_path, h.registration_end,
              h.start_date, h.end_date, u.name AS organiser_name, ${STATUS_SQL} AS status
       FROM hackathons h
       JOIN users u ON u.id = h.organiser_id
       ${where}
       ORDER BY h.start_date DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.status(200).json({
      page: safePage,
      limit,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / limit),
      hackathons,
    });
  } catch (err) {
    next(err);
  }
};

exports.getThemes = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT DISTINCT theme
       FROM hackathons
       WHERE approval_status = 'approved' AND theme IS NOT NULL AND theme <> ''
       ORDER BY theme`
    );
    res.status(200).json(rows.map((row) => row.theme));
  } catch (err) {
    next(err);
  }
};

exports.getHackathonById = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT h.*, u.name AS organiser_name, ${STATUS_SQL} AS status
       FROM hackathons h
       JOIN users u ON u.id = h.organiser_id
       WHERE h.id = ? AND h.approval_status = 'approved'`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Hackathon not found.' });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.getMyHackathons = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT h.id, h.title, h.approval_status, h.start_date, h.end_date,
              ${STATUS_SQL} AS status
       FROM hackathons h
       WHERE h.organiser_id = ?
       ORDER BY h.created_at DESC`,
      [req.user.id]
    );
    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
};

exports.getMyHackathonById = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM hackathons WHERE id = ? AND organiser_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Hackathon not found.' });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.updateHackathon = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT organiser_id FROM hackathons WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Hackathon not found.' });
    }
    if (Number(rows[0].organiser_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'You can only edit your own hackathons.' });
    }

    const {
      title,
      description,
      theme,
      rules,
      prizes,
      registration_start: registrationStart,
      registration_end: registrationEnd,
      start_date: startDate,
      end_date: endDate,
      max_team_size: maxTeamSize,
    } = req.body;
    const bannerPath = req.file ? `uploads/banners/${req.file.filename}` : null;

    await db.query(
      `UPDATE hackathons SET title = ?, description = ?, theme = ?, rules = ?, prizes = ?,
         banner_path = COALESCE(?, banner_path), registration_start = ?, registration_end = ?,
         start_date = ?, end_date = ?, max_team_size = ?
       WHERE id = ?`,
      [
        title.trim(),
        nullable(description),
        nullable(theme),
        nullable(rules),
        nullable(prizes),
        bannerPath,
        toSql(registrationStart),
        toSql(registrationEnd),
        toSql(startDate),
        toSql(endDate),
        maxTeamSize || 4,
        req.params.id,
      ]
    );
    logAction(req, ACTIONS.HACKATHON_UPDATED, `ID: ${req.params.id}, Title: ${title.trim()}`);
    res.status(200).json({ message: 'Hackathon updated.' });
  } catch (err) {
    next(err);
  }
};

exports.deleteHackathon = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT organiser_id, banner_path FROM hackathons WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Hackathon not found.' });
    }
    if (
      Number(rows[0].organiser_id) !== Number(req.user.id)
      && req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'You can only delete your own hackathons.' });
    }

    await db.query('DELETE FROM hackathons WHERE id = ?', [req.params.id]);
    logAction(req, ACTIONS.HACKATHON_DELETED, `ID: ${req.params.id}`);
    if (rows[0].banner_path) {
      fs.unlink(path.join(__dirname, '..', rows[0].banner_path), (err) => {
        if (err && err.code !== 'ENOENT') console.error('Unable to remove banner:', err.message);
      });
    }
    res.status(200).json({ message: 'Hackathon deleted.' });
  } catch (err) {
    next(err);
  }
};

const csvCell = (value) => {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
};

exports.exportParticipants = async (req, res, next) => {
  try {
    const [hackathons] = await db.query(
      'SELECT id, organiser_id FROM hackathons WHERE id = ?',
      [req.params.id]
    );
    const hackathon = hackathons[0];
    if (!hackathon) return res.status(404).json({ message: 'Hackathon not found.' });
    if (
      Number(hackathon.organiser_id) !== Number(req.user.id)
      && req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'You can only export your own hackathons.' });
    }

    const [rows] = await db.query(
      `SELECT u.name, u.email, u.college, t.name AS team_name, tm.checked_in, tm.joined_at
       FROM team_members tm
       JOIN teams t ON t.id = tm.team_id
       JOIN users u ON u.id = tm.user_id
       WHERE tm.hackathon_id = ?
       ORDER BY t.name, u.name`,
      [req.params.id]
    );
    const lines = [[
      'Name', 'Email', 'College', 'Team', 'Checked In', 'Joined At',
    ].map(csvCell).join(',')];
    rows.forEach((row) => lines.push([
      row.name,
      row.email,
      row.college,
      row.team_name,
      row.checked_in ? 'Yes' : 'No',
      row.joined_at,
    ].map(csvCell).join(',')));

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="hackathon-${hackathon.id}-participants.csv"`
    );
    res.status(200).send(`\uFEFF${lines.join('\r\n')}`);
  } catch (err) {
    next(err);
  }
};