const db = require('../database/db');
const { logAction, ACTIONS } = require('../utils/audit');
const { createNotification } = require('../utils/notify');

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

// 1. GET /api/admin/stats
exports.getStats = async (req, res, next) => {
  try {
    // Users stats
    const [[{ totalUsers }]] = await db.query('SELECT COUNT(*) AS totalUsers FROM users');
    const [[{ blockedUsers }]] = await db.query('SELECT COUNT(*) AS blockedUsers FROM users WHERE is_blocked = 1');
    const [[{ pendingOrganisers }]] = await db.query("SELECT COUNT(*) AS pendingOrganisers FROM users WHERE role = 'organiser' AND is_approved = 0");
    const [rolesCount] = await db.query('SELECT role, COUNT(*) AS count FROM users GROUP BY role');
    const byRole = { admin: 0, organiser: 0, judge: 0, participant: 0 };
    rolesCount.forEach((r) => {
      if (byRole[r.role] !== undefined) byRole[r.role] = Number(r.count);
    });

    // Hackathons stats
    const [[hackStats]] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN approval_status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN approval_status = 'approved' AND NOW() < start_date THEN 1 ELSE 0 END) AS upcoming,
        SUM(CASE WHEN approval_status = 'approved' AND NOW() >= start_date AND NOW() <= end_date THEN 1 ELSE 0 END) AS live,
        SUM(CASE WHEN approval_status = 'approved' AND NOW() > end_date THEN 1 ELSE 0 END) AS completed
      FROM hackathons
    `);

    // Teams & Submissions counts
    const [[{ totalTeams }]] = await db.query('SELECT COUNT(*) AS totalTeams FROM teams');
    const [[{ totalSubmissions }]] = await db.query('SELECT COUNT(*) AS totalSubmissions FROM submissions');

    // Registrations per day (last 14 days)
    const [registrationsPerDay] = await db.query(`
      SELECT DATE(joined_at) AS date, COUNT(*) AS count
      FROM team_members
      WHERE joined_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
      GROUP BY DATE(joined_at)
      ORDER BY date ASC
    `);

    // Submissions per hackathon (top 10)
    const [submissionsPerHackathon] = await db.query(`
      SELECT h.id, h.title, COUNT(s.id) AS count
      FROM hackathons h
      LEFT JOIN submissions s ON s.hackathon_id = h.id
      GROUP BY h.id, h.title
      ORDER BY count DESC, h.id ASC
      LIMIT 10
    `);

    res.status(200).json({
      users: {
        total: Number(totalUsers),
        blocked: Number(blockedUsers),
        pendingOrganisers: Number(pendingOrganisers),
        byRole,
      },
      hackathons: {
        total: Number(hackStats.total || 0),
        pending: Number(hackStats.pending || 0),
        approved: Number(hackStats.approved || 0),
        rejected: Number(hackStats.rejected || 0),
        upcoming: Number(hackStats.upcoming || 0),
        live: Number(hackStats.live || 0),
        completed: Number(hackStats.completed || 0),
      },
      teams: Number(totalTeams),
      submissions: Number(totalSubmissions),
      registrationsPerDay: registrationsPerDay.map((r) => ({
        date: r.date,
        count: Number(r.count),
      })),
      submissionsPerHackathon: submissionsPerHackathon.map((s) => ({
        id: s.id,
        title: s.title,
        count: Number(s.count),
      })),
    });
  } catch (err) {
    next(err);
  }
};

// 2. GET /api/admin/users
exports.getUsers = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search, role, status } = req.query;

    const whereClauses = [];
    const params = [];

    if (search) {
      whereClauses.push('(name LIKE ? OR email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (role && ['admin', 'organiser', 'judge', 'participant'].includes(role)) {
      whereClauses.push('role = ?');
      params.push(role);
    }

    if (status) {
      if (status === 'blocked') {
        whereClauses.push('is_blocked = 1');
      } else if (status === 'pending') {
        whereClauses.push("role = 'organiser' AND is_approved = 0");
      } else if (status === 'active') {
        whereClauses.push('is_blocked = 0 AND (role != "organiser" OR is_approved = 1)');
      }
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM users ${whereSql}`,
      params
    );

    const [users] = await db.query(
      `SELECT id, name, email, role, college, skills, github_url, avatar_path, is_approved, is_blocked, created_at
       FROM users
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.status(200).json({
      page,
      limit,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / limit),
      users,
    });
  } catch (err) {
    next(err);
  }
};

// 3. PATCH /api/admin/users/:id/block
exports.toggleUserBlock = async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    const { blocked } = req.body;

    if (targetId === Number(req.user.id)) {
      return res.status(400).json({ message: 'You cannot block or unblock yourself.' });
    }

    const [rows] = await db.query('SELECT id, name, email FROM users WHERE id = ?', [targetId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isBlocked = blocked === true || blocked === 1 || blocked === 'true' ? 1 : 0;
    await db.query('UPDATE users SET is_blocked = ? WHERE id = ?', [isBlocked, targetId]);

    const action = isBlocked ? ACTIONS.USER_BLOCKED : ACTIONS.USER_UNBLOCKED;
    await logAction(req, action, `User: ${rows[0].email} (ID: ${targetId})`);

    res.status(200).json({
      message: `User has been ${isBlocked ? 'blocked' : 'unblocked'}.`,
      is_blocked: isBlocked,
    });
  } catch (err) {
    next(err);
  }
};

// 4. PATCH /api/admin/users/:id/approval
exports.updateOrganiserApproval = async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    const { approved } = req.body;

    const [rows] = await db.query('SELECT id, name, email, role FROM users WHERE id = ?', [targetId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const targetUser = rows[0];
    if (targetUser.role !== 'organiser') {
      return res.status(400).json({ message: 'Approval status can only be modified for organiser accounts.' });
    }

    const isApproved = approved === true || approved === 1 || approved === 'true' ? 1 : 0;
    await db.query('UPDATE users SET is_approved = ? WHERE id = ?', [isApproved, targetId]);

    const action = isApproved ? ACTIONS.USER_APPROVED : ACTIONS.USER_REJECTED;
    await logAction(req, action, `Organiser: ${targetUser.email} (ID: ${targetId})`);

    res.status(200).json({
      message: `Organiser account has been ${isApproved ? 'approved' : 'rejected'}.`,
      is_approved: isApproved,
    });
  } catch (err) {
    next(err);
  }
};

// 5. PATCH /api/admin/users/:id/role
exports.updateUserRole = async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    const { role } = req.body;

    if (targetId === Number(req.user.id)) {
      return res.status(400).json({ message: 'You cannot change your own role.' });
    }

    const [rows] = await db.query('SELECT id, name, email, role FROM users WHERE id = ?', [targetId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const oldRole = rows[0].role;
    // If changing to organiser, ensure approval status is active for role change
    await db.query('UPDATE users SET role = ?, is_approved = 1 WHERE id = ?', [role, targetId]);

    await logAction(req, ACTIONS.USER_ROLE_CHANGED, `User: ${rows[0].email} from ${oldRole} to ${role}`);

    res.status(200).json({
      message: `User role changed to ${role}.`,
      role,
    });
  } catch (err) {
    next(err);
  }
};

// 6. DELETE /api/admin/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);

    if (targetId === Number(req.user.id)) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const [rows] = await db.query('SELECT id, name, email FROM users WHERE id = ?', [targetId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await db.query('DELETE FROM users WHERE id = ?', [targetId]);

    await logAction(req, ACTIONS.USER_DELETED, `User: ${rows[0].email} (ID: ${targetId})`);

    res.status(200).json({ message: 'User deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// 7. GET /api/admin/hackathons
exports.getHackathons = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search, status } = req.query;

    const whereClauses = [];
    const params = [];

    if (search) {
      whereClauses.push('(h.title LIKE ? OR h.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      whereClauses.push('h.approval_status = ?');
      params.push(status);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM hackathons h ${whereSql}`,
      params
    );

    const [hackathons] = await db.query(
      `SELECT h.id, h.organiser_id, h.title, h.theme, h.approval_status,
              h.registration_start, h.registration_end, h.start_date, h.end_date,
              h.max_team_size, h.created_at,
              u.name AS organiser_name, u.email AS organiser_email,
              (SELECT COUNT(*) FROM teams WHERE hackathon_id = h.id) AS team_count
       FROM hackathons h
       JOIN users u ON u.id = h.organiser_id
       ${whereSql}
       ORDER BY h.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.status(200).json({
      page,
      limit,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / limit),
      hackathons,
    });
  } catch (err) {
    next(err);
  }
};

// 8. PATCH /api/admin/hackathons/:id/approval
exports.updateHackathonApproval = async (req, res, next) => {
  try {
    const hackathonId = Number(req.params.id);
    const { status, reason } = req.body;

    const [rows] = await db.query('SELECT * FROM hackathons WHERE id = ?', [hackathonId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Hackathon not found.' });
    }

    const hackathon = rows[0];
    await db.query('UPDATE hackathons SET approval_status = ? WHERE id = ?', [status, hackathonId]);

    // Notify organiser
    const notifMsg = status === 'approved'
      ? `Your hackathon "${hackathon.title}" has been approved by the admin!`
      : `Your hackathon "${hackathon.title}" was rejected.${reason ? ' Reason: ' + reason : ''}`;

    await createNotification(hackathon.organiser_id, notifMsg, 'my-hackathons.html');

    const action = status === 'approved' ? ACTIONS.HACKATHON_APPROVED : ACTIONS.HACKATHON_REJECTED;
    const details = `Hackathon: ${hackathon.title} (ID: ${hackathonId})${reason ? ', Reason: ' + reason : ''}`;
    await logAction(req, action, details);

    res.status(200).json({
      message: `Hackathon has been ${status}.`,
      approval_status: status,
    });
  } catch (err) {
    next(err);
  }
};

// 9. GET /api/admin/audit-logs
exports.getAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { action, search } = req.query;

    const whereClauses = [];
    const params = [];

    if (action) {
      whereClauses.push('a.action = ?');
      params.push(action);
    }

    if (search) {
      whereClauses.push('(a.action LIKE ? OR a.details LIKE ? OR a.ip_address LIKE ? OR u.name LIKE ? OR u.email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id ${whereSql}`,
      params
    );

    const [logs] = await db.query(
      `SELECT a.id, a.user_id, a.action, a.details, a.ip_address, a.created_at,
              u.name AS actor_name, u.email AS actor_email
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ${whereSql}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.status(200).json({
      page,
      limit,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / limit),
      logs,
    });
  } catch (err) {
    next(err);
  }
};
