const crypto = require('crypto');
const db = require('../database/db');
const { logAction, ACTIONS } = require('../utils/audit');

const STATUS_SQL = `(CASE
  WHEN h.results_published = 1 THEN 'completed'
  WHEN NOW() < h.start_date THEN 'upcoming'
  WHEN NOW() <= h.end_date THEN 'live'
  ELSE 'completed'
END)`;

function generateInviteCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function generateCheckinCode() {
  return 'chk_' + crypto.randomBytes(16).toString('hex');
}

// POST /api/hackathons/:id/teams
exports.createTeam = async (req, res, next) => {
  try {
    const hackathonId = Number(req.params.id);
    const { name } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ message: 'Team name must be between 2 and 100 characters.' });
    }

    // Verify hackathon exists, approved, and registration window
    const [hRows] = await db.query(
      'SELECT id, title, approval_status, registration_start, registration_end, max_team_size FROM hackathons WHERE id = ?',
      [hackathonId]
    );
    if (hRows.length === 0) {
      return res.status(404).json({ message: 'Hackathon not found.' });
    }
    const hackathon = hRows[0];
    if (hackathon.approval_status !== 'approved') {
      return res.status(400).json({ message: 'This hackathon is not yet approved for registration.' });
    }

    const now = new Date();
    const regStart = new Date(hackathon.registration_start);
    const regEnd = new Date(hackathon.registration_end);
    if (now < regStart || now > regEnd) {
      return res.status(400).json({ message: 'Registration is not currently open for this hackathon.' });
    }

    // Check if user is already in a team for this hackathon
    const [existing] = await db.query(
      'SELECT id FROM team_members WHERE user_id = ? AND hackathon_id = ?',
      [userId, hackathonId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'You are already a member of a team in this hackathon.' });
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    for (let attempts = 0; attempts < 5; attempts++) {
      const [dup] = await db.query('SELECT id FROM teams WHERE invite_code = ?', [inviteCode]);
      if (dup.length === 0) break;
      inviteCode = generateInviteCode();
    }

    const [tResult] = await db.query(
      'INSERT INTO teams (hackathon_id, name, invite_code, leader_id) VALUES (?, ?, ?, ?)',
      [hackathonId, name.trim(), inviteCode, userId]
    );
    const teamId = tResult.insertId;

    // Add leader to team_members
    const checkinCode = generateCheckinCode();
    await db.query(
      'INSERT INTO team_members (team_id, user_id, hackathon_id, checkin_code, checked_in) VALUES (?, ?, ?, ?, 0)',
      [teamId, userId, hackathonId, checkinCode]
    );

    logAction(req, ACTIONS.TEAM_CREATED, `Team "${name.trim()}" (ID ${teamId}) created for hackathon ${hackathonId}`);

    res.status(201).json({
      message: 'Team created successfully.',
      team: {
        id: teamId,
        name: name.trim(),
        invite_code: inviteCode,
        leader_id: userId,
        hackathon_id: hackathonId,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/teams/join
exports.joinTeam = async (req, res, next) => {
  try {
    const { invite_code } = req.body;
    const userId = req.user.id;

    if (!invite_code || typeof invite_code !== 'string') {
      return res.status(400).json({ message: 'Invite code is required.' });
    }
    const code = invite_code.trim().toUpperCase();

    const [teams] = await db.query(
      `SELECT t.*, h.title AS hackathon_title, h.approval_status, h.registration_start, h.registration_end, h.max_team_size
       FROM teams t
       JOIN hackathons h ON t.hackathon_id = h.id
       WHERE t.invite_code = ?`,
      [code]
    );
    if (teams.length === 0) {
      return res.status(404).json({ message: 'Invalid team invite code.' });
    }
    const team = teams[0];

    if (team.approval_status !== 'approved') {
      return res.status(400).json({ message: 'This hackathon is not yet approved.' });
    }

    const now = new Date();
    const regStart = new Date(team.registration_start);
    const regEnd = new Date(team.registration_end);
    if (now < regStart || now > regEnd) {
      return res.status(400).json({ message: 'Registration has closed for this hackathon.' });
    }

    // Check if user already in any team for this hackathon
    const [existing] = await db.query(
      'SELECT id FROM team_members WHERE user_id = ? AND hackathon_id = ?',
      [userId, team.hackathon_id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'You are already registered in a team for this hackathon.' });
    }

    // Check capacity
    const [mCount] = await db.query(
      'SELECT COUNT(*) AS total FROM team_members WHERE team_id = ?',
      [team.id]
    );
    if (mCount[0].total >= team.max_team_size) {
      return res.status(400).json({
        message: `Team is full. Maximum team size is ${team.max_team_size} members.`,
      });
    }

    // Add member
    const checkinCode = generateCheckinCode();
    await db.query(
      'INSERT INTO team_members (team_id, user_id, hackathon_id, checkin_code, checked_in) VALUES (?, ?, ?, ?, 0)',
      [team.id, userId, team.hackathon_id, checkinCode]
    );

    logAction(req, ACTIONS.TEAM_JOINED, `Joined team "${team.name}" (ID ${team.id})`);

    res.status(200).json({
      message: `Successfully joined ${team.name}!`,
      teamId: team.id,
      teamName: team.name,
      hackathonId: team.hackathon_id,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/hackathons/:id/my-team
exports.getMyTeamForHackathon = async (req, res, next) => {
  try {
    const hackathonId = Number(req.params.id);
    const userId = req.user.id;

    const [memRows] = await db.query(
      `SELECT tm.team_id, tm.checkin_code, tm.checked_in, tm.checked_in_at,
              t.name AS team_name, t.invite_code, t.leader_id, t.created_at,
              h.title AS hackathon_title, h.max_team_size, h.results_published, ${STATUS_SQL} AS hackathon_status
       FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       JOIN hackathons h ON t.hackathon_id = h.id
       WHERE tm.user_id = ? AND tm.hackathon_id = ?`,
      [userId, hackathonId]
    );

    if (memRows.length === 0) {
      return res.status(200).json({ team: null });
    }

    const teamInfo = memRows[0];

    // Fetch all members of this team
    const [members] = await db.query(
      `SELECT u.id, u.name, u.email, u.college, u.skills, u.avatar_path,
              tm.checkin_code, tm.checked_in, tm.checked_in_at, tm.joined_at,
              (u.id = ?) AS is_leader
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = ?
       ORDER BY (u.id = ?) DESC, tm.joined_at ASC`,
      [teamInfo.leader_id, teamInfo.team_id, teamInfo.leader_id]
    );

    // Fetch team submission if any
    const [subRows] = await db.query(
      'SELECT id, title, description, github_url, demo_url, file_path, submitted_at FROM submissions WHERE team_id = ? LIMIT 1',
      [teamInfo.team_id]
    );

    res.status(200).json({
      team: {
        id: teamInfo.team_id,
        name: teamInfo.team_name,
        invite_code: teamInfo.invite_code,
        leader_id: teamInfo.leader_id,
        hackathon_id: hackathonId,
        hackathon_title: teamInfo.hackathon_title,
        max_team_size: teamInfo.max_team_size,
        hackathon_status: teamInfo.hackathon_status,
        my_checkin_code: teamInfo.checkin_code,
        my_checked_in: teamInfo.checked_in,
        my_checked_in_at: teamInfo.checked_in_at,
      },
      isLeader: teamInfo.leader_id === userId,
      members,
      submission: subRows[0] || null,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/teams/mine
exports.getMyTeams = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT t.id, t.name, t.invite_code, t.leader_id, t.created_at,
              h.id AS hackathon_id, h.title AS hackathon_title, h.start_date, h.end_date, h.results_published,
              ${STATUS_SQL} AS hackathon_status,
              (SELECT COUNT(*) FROM team_members tm2 WHERE tm2.team_id = t.id) AS member_count,
              (t.leader_id = ?) AS is_leader,
              tm.checked_in, tm.checkin_code
       FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       JOIN hackathons h ON t.hackathon_id = h.id
       WHERE tm.user_id = ?
       ORDER BY tm.joined_at DESC`,
      [userId, userId]
    );

    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/teams/:id/leave
exports.leaveTeam = async (req, res, next) => {
  try {
    const teamId = Number(req.params.id);
    const userId = req.user.id;

    const [memRows] = await db.query(
      'SELECT tm.*, t.leader_id, t.name, t.hackathon_id FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE tm.team_id = ? AND tm.user_id = ?',
      [teamId, userId]
    );
    if (memRows.length === 0) {
      return res.status(404).json({ message: 'You are not a member of this team.' });
    }
    const mem = memRows[0];

    // Find other members
    const [otherMembers] = await db.query(
      'SELECT user_id FROM team_members WHERE team_id = ? AND user_id != ? ORDER BY joined_at ASC',
      [teamId, userId]
    );

    if (mem.leader_id === userId) {
      if (otherMembers.length > 0) {
        // Transfer leadership to the next earliest member
        const nextLeaderId = otherMembers[0].user_id;
        await db.query('UPDATE teams SET leader_id = ? WHERE id = ?', [nextLeaderId, teamId]);
        await db.query('DELETE FROM team_members WHERE team_id = ? AND user_id = ?', [teamId, userId]);
      } else {
        // Only member, delete team and its members/submissions
        await db.query('DELETE FROM team_members WHERE team_id = ?', [teamId]);
        await db.query('DELETE FROM submissions WHERE team_id = ?', [teamId]);
        await db.query('DELETE FROM teams WHERE id = ?', [teamId]);
      }
    } else {
      await db.query('DELETE FROM team_members WHERE team_id = ? AND user_id = ?', [teamId, userId]);
    }

    logAction(req, ACTIONS.TEAM_LEFT, `User ${userId} left team "${mem.name}" (ID ${teamId})`);

    res.status(200).json({ message: 'Successfully left the team.' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/teams/:id/members/:userId
exports.removeMember = async (req, res, next) => {
  try {
    const teamId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);
    const callerId = req.user.id;

    const [tRows] = await db.query('SELECT * FROM teams WHERE id = ?', [teamId]);
    if (tRows.length === 0) {
      return res.status(404).json({ message: 'Team not found.' });
    }
    const team = tRows[0];

    if (team.leader_id !== callerId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the team leader can remove team members.' });
    }

    if (targetUserId === team.leader_id) {
      return res.status(400).json({ message: 'Team leader cannot be removed. Transfer leadership or leave team.' });
    }

    const [del] = await db.query(
      'DELETE FROM team_members WHERE team_id = ? AND user_id = ?',
      [teamId, targetUserId]
    );
    if (del.affectedRows === 0) {
      return res.status(404).json({ message: 'Member not found in this team.' });
    }

    logAction(req, ACTIONS.TEAM_MEMBER_REMOVED, `Removed user ${targetUserId} from team "${team.name}" (ID ${teamId})`);

    res.status(200).json({ message: 'Member removed from team.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/teams/:id/invite
exports.regenerateInviteCode = async (req, res, next) => {
  try {
    const teamId = Number(req.params.id);
    const callerId = req.user.id;

    const [tRows] = await db.query('SELECT * FROM teams WHERE id = ?', [teamId]);
    if (tRows.length === 0) {
      return res.status(404).json({ message: 'Team not found.' });
    }
    const team = tRows[0];

    if (team.leader_id !== callerId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the team leader can regenerate the invite code.' });
    }

    let newCode = generateInviteCode();
    for (let i = 0; i < 5; i++) {
      const [dup] = await db.query('SELECT id FROM teams WHERE invite_code = ?', [newCode]);
      if (dup.length === 0) break;
      newCode = generateInviteCode();
    }

    await db.query('UPDATE teams SET invite_code = ? WHERE id = ?', [newCode, teamId]);

    res.status(200).json({
      message: 'Invite code regenerated successfully.',
      invite_code: newCode,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/hackathons/:id/teams
exports.getHackathonTeams = async (req, res, next) => {
  try {
    const hackathonId = Number(req.params.id);

    // Verify permission: organiser of this hackathon or admin
    if (req.user.role !== 'admin') {
      const [h] = await db.query('SELECT organiser_id FROM hackathons WHERE id = ?', [hackathonId]);
      if (h.length === 0 || h[0].organiser_id !== req.user.id) {
        return res.status(403).json({ message: 'Access denied. You do not manage this hackathon.' });
      }
    }

    const [teams] = await db.query(
      `SELECT t.id, t.name, t.invite_code, t.created_at,
              u.name AS leader_name, u.email AS leader_email, u.college AS leader_college,
              (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) AS member_count,
              (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id AND tm.checked_in = 1) AS checked_in_count,
              (SELECT s.id FROM submissions s WHERE s.team_id = t.id LIMIT 1) AS submission_id
       FROM teams t
       JOIN users u ON t.leader_id = u.id
       WHERE t.hackathon_id = ?
       ORDER BY t.created_at DESC`,
      [hackathonId]
    );

    res.status(200).json(teams);
  } catch (err) {
    next(err);
  }
};
