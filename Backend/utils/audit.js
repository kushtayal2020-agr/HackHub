const db = require('../database/db');

const ACTIONS = {
  REGISTER: 'REGISTER',
  LOGIN: 'LOGIN',
  LOGIN_FAILED: 'LOGIN_FAILED',
  USER_BLOCKED: 'USER_BLOCKED',
  USER_UNBLOCKED: 'USER_UNBLOCKED',
  USER_APPROVED: 'USER_APPROVED',
  USER_REJECTED: 'USER_REJECTED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_DELETED: 'USER_DELETED',
  HACKATHON_CREATED: 'HACKATHON_CREATED',
  HACKATHON_UPDATED: 'HACKATHON_UPDATED',
  HACKATHON_DELETED: 'HACKATHON_DELETED',
  HACKATHON_APPROVED: 'HACKATHON_APPROVED',
  HACKATHON_REJECTED: 'HACKATHON_REJECTED',
  JUDGE_ASSIGNED: 'JUDGE_ASSIGNED',
  RESULTS_PUBLISHED: 'RESULTS_PUBLISHED',
  TEAM_CREATED: 'TEAM_CREATED',
  TEAM_JOINED: 'TEAM_JOINED',
  TEAM_LEFT: 'TEAM_LEFT',
  TEAM_MEMBER_REMOVED: 'TEAM_MEMBER_REMOVED',
  CHECKIN_COMPLETED: 'CHECKIN_COMPLETED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  SUBMISSION_CREATED: 'SUBMISSION_CREATED',
  SUBMISSION_UPDATED: 'SUBMISSION_UPDATED',
  SUBMISSION_DELETED: 'SUBMISSION_DELETED',
};

async function logAction(req, action, details = null) {
  try {
    const userId = req && req.user ? req.user.id : null;
    const ip = req ? (req.ip || (req.socket && req.socket.remoteAddress) || null) : null;
    const detailsStr = details ? String(details).slice(0, 255) : null;

    await db.query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [userId, action, detailsStr, ip]
    );
  } catch (err) {
    // Best-effort: audit logging should never crash the main request
    console.error('Audit log error:', err.message);
  }
}

module.exports = {
  ACTIONS,
  logAction,
};
