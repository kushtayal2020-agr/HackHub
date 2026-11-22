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

function unlinkSafe(relPath) {
  if (!relPath) return;
  const fullPath = path.join(__dirname, '..', relPath);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch (e) {
      console.error('Failed to unlink file:', e.message);
    }
  }
}

// POST /api/hackathons/:id/submissions
exports.createSubmission = async (req, res, next) => {
  try {
    const hackathonId = Number(req.params.id);
    const userId = req.user.id;
    const { title, description, github_url, demo_url } = req.body;

    if (!title || title.trim().length < 3 || title.trim().length > 200) {
      if (req.file) unlinkSafe(`uploads/submissions/${req.file.filename}`);
      return res.status(400).json({ message: 'Project title must be between 3 and 200 characters.' });
    }

    if (!github_url || !github_url.trim()) {
      if (req.file) unlinkSafe(`uploads/submissions/${req.file.filename}`);
      return res.status(400).json({ message: 'A valid GitHub/repository URL is required.' });
    }

    // Verify hackathon exists, approved, and not past end_date
    const [hRows] = await db.query(
      'SELECT id, title, approval_status, start_date, end_date FROM hackathons WHERE id = ?',
      [hackathonId]
    );
    if (hRows.length === 0) {
      if (req.file) unlinkSafe(`uploads/submissions/${req.file.filename}`);
      return res.status(404).json({ message: 'Hackathon not found.' });
    }
    const hackathon = hRows[0];
    if (hackathon.approval_status !== 'approved') {
      if (req.file) unlinkSafe(`uploads/submissions/${req.file.filename}`);
      return res.status(400).json({ message: 'This hackathon is not yet approved.' });
    }

    const now = new Date();
    const endDate = new Date(hackathon.end_date);
    if (now > endDate) {
      if (req.file) unlinkSafe(`uploads/submissions/${req.file.filename}`);
      return res.status(400).json({ message: 'The submission deadline for this hackathon has passed.' });
    }

    // Check user's team membership in this hackathon
    const [tmRows] = await db.query(
      `SELECT t.id AS team_id, t.name AS team_name, t.leader_id
       FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       WHERE tm.user_id = ? AND tm.hackathon_id = ?`,
      [userId, hackathonId]
    );
    if (tmRows.length === 0) {
      if (req.file) unlinkSafe(`uploads/submissions/${req.file.filename}`);
      return res.status(400).json({
        message: 'You must be registered in a team for this hackathon to submit a project.',
      });
    }
    const team = tmRows[0];

    // Check if team already has a submission
    const [subRows] = await db.query('SELECT id FROM submissions WHERE team_id = ?', [team.team_id]);
    if (subRows.length > 0) {
      if (req.file) unlinkSafe(`uploads/submissions/${req.file.filename}`);
      return res.status(400).json({
        message: 'Your team has already submitted a project. You can edit your existing submission.',
      });
    }

    const filePath = req.file ? `uploads/submissions/${req.file.filename}` : null;
    const cleanDesc = description ? description.trim() : null;
    const cleanDemo = demo_url && demo_url.trim() ? demo_url.trim() : null;

    const [result] = await db.query(
      `INSERT INTO submissions (team_id, hackathon_id, title, description, github_url, demo_url, file_path)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [team.team_id, hackathonId, title.trim(), cleanDesc, github_url.trim(), cleanDemo, filePath]
    );

    logAction(
      req,
      ACTIONS.SUBMISSION_CREATED,
      `Project "${title.trim()}" (ID ${result.insertId}) submitted by team "${team.team_name}" for hackathon ${hackathonId}`
    );

    res.status(201).json({
      message: 'Project submitted successfully!',
      submission: {
        id: result.insertId,
        team_id: team.team_id,
        team_name: team.team_name,
        hackathon_id: hackathonId,
        title: title.trim(),
        description: cleanDesc,
        github_url: github_url.trim(),
        demo_url: cleanDemo,
        file_path: filePath,
        submitted_at: now,
      },
    });
  } catch (err) {
    if (req.file) unlinkSafe(`uploads/submissions/${req.file.filename}`);
    next(err);
  }
};

// PUT /api/submissions/:id
exports.updateSubmission = async (req, res, next) => {
  try {
    const submissionId = Number(req.params.id);
    const userId = req.user.id;
    const { title, description, github_url, demo_url } = req.body;

    const [rows] = await db.query(
      `SELECT s.*, h.end_date, h.title AS hackathon_title, t.name AS team_name
       FROM submissions s
       JOIN hackathons h ON s.hackathon_id = h.id
       JOIN teams t ON s.team_id = t.id
       WHERE s.id = ?`,
      [submissionId]
    );
    if (rows.length === 0) {
      if (req.file) unlinkSafe(`uploads/submissions/${req.file.filename}`);
      return res.status(404).json({ message: 'Submission not found.' });
    }
    const sub = rows[0];

    // Check deadline (unless admin)
    if (req.user.role !== 'admin' && new Date() > new Date(sub.end_date)) {
      if (req.file) unlinkSafe(`uploads/submissions/${req.file.filename}`);
      return res.status(400).json({ message: 'The submission deadline has passed. Projects can no longer be edited.' });
    }

    // Check permission: user must be member of team (or admin)
    if (req.user.role !== 'admin') {
      const [mem] = await db.query(
        'SELECT id FROM team_members WHERE team_id = ? AND user_id = ?',
        [sub.team_id, userId]
      );
      if (mem.length === 0) {
        if (req.file) unlinkSafe(`uploads/submissions/${req.file.filename}`);
        return res.status(403).json({ message: 'You do not have permission to edit this submission.' });
      }
    }

    const newTitle = title ? title.trim() : sub.title;
    const newDesc = description !== undefined ? (description ? description.trim() : null) : sub.description;
    const newGithub = github_url ? github_url.trim() : sub.github_url;
    const newDemo = demo_url !== undefined ? (demo_url && demo_url.trim() ? demo_url.trim() : null) : sub.demo_url;

    let newFilePath = sub.file_path;
    if (req.file) {
      unlinkSafe(sub.file_path);
      newFilePath = `uploads/submissions/${req.file.filename}`;
    }

    await db.query(
      `UPDATE submissions
       SET title = ?, description = ?, github_url = ?, demo_url = ?, file_path = ?, updated_at = NOW()
       WHERE id = ?`,
      [newTitle, newDesc, newGithub, newDemo, newFilePath, submissionId]
    );

    logAction(
      req,
      ACTIONS.SUBMISSION_UPDATED,
      `Submission ID ${submissionId} updated by user ${userId}`
    );

    res.status(200).json({
      message: 'Submission updated successfully!',
      submission: {
        id: submissionId,
        title: newTitle,
        description: newDesc,
        github_url: newGithub,
        demo_url: newDemo,
        file_path: newFilePath,
        team_id: sub.team_id,
        team_name: sub.team_name,
        hackathon_id: sub.hackathon_id,
      },
    });
  } catch (err) {
    if (req.file) unlinkSafe(`uploads/submissions/${req.file.filename}`);
    next(err);
  }
};

// GET /api/hackathons/:id/submissions/mine
exports.getMySubmissionForHackathon = async (req, res, next) => {
  try {
    const hackathonId = Number(req.params.id);
    const userId = req.user.id;

    const [tmRows] = await db.query(
      `SELECT t.id, t.name, t.leader_id, h.title AS hackathon_title, h.end_date, ${STATUS_SQL} AS hackathon_status
       FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       JOIN hackathons h ON t.hackathon_id = h.id
       WHERE tm.user_id = ? AND tm.hackathon_id = ?`,
      [userId, hackathonId]
    );

    if (tmRows.length === 0) {
      return res.status(200).json({ submission: null, team: null });
    }
    const team = tmRows[0];

    const [subRows] = await db.query(
      'SELECT * FROM submissions WHERE team_id = ? LIMIT 1',
      [team.id]
    );

    res.status(200).json({
      team: {
        id: team.id,
        name: team.name,
        leader_id: team.leader_id,
        is_leader: team.leader_id === userId,
        hackathon_id: hackathonId,
        hackathon_title: team.hackathon_title,
        hackathon_status: team.hackathon_status,
        end_date: team.end_date,
      },
      submission: subRows[0] || null,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/submissions/:id
exports.getSubmissionById = async (req, res, next) => {
  try {
    const submissionId = Number(req.params.id);

    const [rows] = await db.query(
      `SELECT s.*, t.name AS team_name, t.leader_id,
              h.title AS hackathon_title, h.start_date, h.end_date, h.results_published,
              ${STATUS_SQL} AS hackathon_status,
              u.name AS leader_name, u.email AS leader_email
       FROM submissions s
       JOIN teams t ON s.team_id = t.id
       JOIN hackathons h ON s.hackathon_id = h.id
       JOIN users u ON t.leader_id = u.id
       WHERE s.id = ?`,
      [submissionId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found.' });
    }
    const sub = rows[0];

    // Fetch team members
    const [members] = await db.query(
      `SELECT u.id, u.name, u.email, u.college, u.skills, u.avatar_path, (u.id = ?) AS is_leader
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = ?
       ORDER BY (u.id = ?) DESC, tm.joined_at ASC`,
      [sub.leader_id, sub.team_id, sub.leader_id]
    );

    res.status(200).json({
      submission: sub,
      members,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/hackathons/:id/submissions
exports.getHackathonSubmissions = async (req, res, next) => {
  try {
    const hackathonId = Number(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check permission: Organiser owner, Assigned Judge, Admin, or if results published
    let canView = userRole === 'admin';
    if (!canView && userRole === 'organiser') {
      const [h] = await db.query('SELECT organiser_id FROM hackathons WHERE id = ?', [hackathonId]);
      if (h.length > 0 && h[0].organiser_id === userId) canView = true;
    }
    if (!canView && userRole === 'judge') {
      const [ja] = await db.query(
        'SELECT id FROM judge_assignments WHERE hackathon_id = ? AND judge_id = ?',
        [hackathonId, userId]
      );
      if (ja.length > 0) canView = true;
    }
    if (!canView) {
      const [pub] = await db.query('SELECT results_published FROM hackathons WHERE id = ?', [hackathonId]);
      if (pub.length > 0 && pub[0].results_published === 1) canView = true;
    }

    if (!canView) {
      return res.status(403).json({
        message: 'Access denied. Only organisers, assigned judges, and administrators can view all submissions.',
      });
    }

    const [subs] = await db.query(
      `SELECT s.id, s.team_id, s.hackathon_id, s.title, s.description,
              s.github_url, s.demo_url, s.file_path, s.submitted_at, s.updated_at,
              t.name AS team_name,
              u.name AS leader_name, u.email AS leader_email, u.college AS leader_college,
              (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) AS member_count,
              (SELECT COUNT(DISTINCT judge_id) FROM scores sc WHERE sc.submission_id = s.id) AS scores_count,
              (SELECT AVG(score) FROM scores sc WHERE sc.submission_id = s.id) AS raw_avg_score
       FROM submissions s
       JOIN teams t ON s.team_id = t.id
       JOIN users u ON t.leader_id = u.id
       WHERE s.hackathon_id = ?
       ORDER BY s.submitted_at DESC`,
      [hackathonId]
    );

    res.status(200).json(subs);
  } catch (err) {
    next(err);
  }
};

// GET /api/submissions/mine
exports.getMySubmissions = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT s.id, s.title, s.description, s.github_url, s.demo_url, s.file_path, s.submitted_at, s.updated_at,
              t.id AS team_id, t.name AS team_name, (t.leader_id = ?) AS is_leader,
              h.id AS hackathon_id, h.title AS hackathon_title, h.start_date, h.end_date,
              ${STATUS_SQL} AS hackathon_status,
              (SELECT COUNT(*) FROM team_members tm2 WHERE tm2.team_id = t.id) AS member_count
       FROM team_members tm
       JOIN submissions s ON tm.team_id = s.team_id
       JOIN teams t ON s.team_id = t.id
       JOIN hackathons h ON s.hackathon_id = h.id
       WHERE tm.user_id = ?
       ORDER BY s.submitted_at DESC`,
      [userId, userId]
    );

    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/submissions/:id
exports.deleteSubmission = async (req, res, next) => {
  try {
    const submissionId = Number(req.params.id);
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT s.*, h.end_date, t.leader_id
       FROM submissions s
       JOIN hackathons h ON s.hackathon_id = h.id
       JOIN teams t ON s.team_id = t.id
       WHERE s.id = ?`,
      [submissionId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found.' });
    }
    const sub = rows[0];

    // Check permission: Leader or Admin
    if (req.user.role !== 'admin' && sub.leader_id !== userId) {
      return res.status(403).json({ message: 'Only the team leader or administrator can withdraw a project submission.' });
    }

    // Check deadline
    if (req.user.role !== 'admin' && new Date() > new Date(sub.end_date)) {
      return res.status(400).json({ message: 'Cannot withdraw submission after deadline.' });
    }

    unlinkSafe(sub.file_path);
    await db.query('DELETE FROM submissions WHERE id = ?', [submissionId]);

    logAction(
      req,
      ACTIONS.SUBMISSION_DELETED,
      `Submission ID ${submissionId} withdrawn by user ${userId}`
    );

    res.status(200).json({ message: 'Submission withdrawn successfully.' });
  } catch (err) {
    next(err);
  }
};
