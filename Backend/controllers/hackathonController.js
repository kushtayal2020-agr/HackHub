const db = require('../database/db');

const STATUS_SQL = `(CASE
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
    res.status(200).json({ message: 'Hackathon updated.' });
  } catch (err) {
    next(err);
  }
};

exports.deleteHackathon = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT organiser_id FROM hackathons WHERE id = ?',
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
    res.status(200).json({ message: 'Hackathon deleted.' });
  } catch (err) {
    next(err);
  }
};