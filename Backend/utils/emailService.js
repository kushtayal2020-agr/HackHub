const db = require('../database/db');
const { sendMail } = require('./mailer');

const esc = (value) => String(value === null || value === undefined ? '' : value)
  .replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
const siteUrl = () => process.env.FRONTEND_URL || '';
const fmt = (date) => (typeof date === 'string' ? date : new Date(date).toLocaleString('en-IN'));
const wrap = (heading, bodyHtml) => `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e2e8f0">
    <div style="background:#1a3c6e;color:#fff;padding:14px 20px;font-size:18px">HackHub</div>
    <div style="padding:20px"><h2 style="margin-top:0;color:#1a3c6e">${esc(heading)}</h2>${bodyHtml}</div>
    <div style="background:#f1f5f9;padding:10px 20px;font-size:12px;color:#64748b">
      This is an automated email from HackHub. Please do not reply.
    </div>
  </div>`;

exports.sendRegistrationEmail = async (userId, hackathonId) => {
  const [[user]] = await db.query('SELECT name, email FROM users WHERE id = ?', [userId]);
  const [[hack]] = await db.query(
    'SELECT title, start_date FROM hackathons WHERE id = ?', [hackathonId]
  );
  if (!user || !hack) return false;
  return sendMail(user.email, `Registered: ${hack.title}`, wrap('Registration confirmed', `
    <p>Hi ${esc(user.name)},</p>
    <p>You are registered for <b>${esc(hack.title)}</b>.</p>
    <p>The hackathon starts on <b>${esc(fmt(hack.start_date))}</b>.</p>
    <p><a href="${esc(siteUrl())}/hackathon-detail.html?id=${esc(hackathonId)}">View hackathon</a></p>`));
};

exports.sendTeamInviteEmail = async (
  toEmail, inviterName, teamName, inviteCode, hackathonTitle
) => sendMail(toEmail, `Team invite: ${teamName}`, wrap('You are invited to a team', `
  <p><b>${esc(inviterName)}</b> invited you to join the team <b>${esc(teamName)}</b>
     for <b>${esc(hackathonTitle)}</b>.</p>
  <p>Your invite code: <b style="font-size:18px">${esc(inviteCode)}</b></p>
  <p>Log in to HackHub and enter this code to join the team.</p>`));

exports.sendResultsPublishedEmails = async (hackathonId) => {
  const [[hack]] = await db.query('SELECT title FROM hackathons WHERE id = ?', [hackathonId]);
  if (!hack) return 0;
  const [people] = await db.query(
    `SELECT DISTINCT u.name, u.email
     FROM team_members tm JOIN users u ON u.id = tm.user_id
     WHERE tm.hackathon_id = ?`,
    [hackathonId]
  );
  await Promise.allSettled(people.map((person) => sendMail(
    person.email,
    `Results published: ${hack.title}`,
    wrap('Results are out', `<p>Hi ${esc(person.name)},</p>
      <p>The results of <b>${esc(hack.title)}</b> have been published.</p>
      <p><a href="${esc(siteUrl())}/hackathon-detail.html?id=${esc(hackathonId)}">View results</a></p>`)
  )));
  return people.length;
};

exports.sendAnnouncementEmails = async (hackathonId, title, message) => {
  const [[hack]] = await db.query('SELECT title FROM hackathons WHERE id = ?', [hackathonId]);
  if (!hack) return 0;
  const [people] = await db.query(
    `SELECT DISTINCT u.name, u.email
     FROM team_members tm JOIN users u ON u.id = tm.user_id
     WHERE tm.hackathon_id = ?`,
    [hackathonId]
  );
  await Promise.allSettled(people.map((person) => sendMail(
    person.email,
    `${hack.title}: ${title}`,
    wrap(title, `<p>Hi ${esc(person.name)}, a new announcement for <b>${esc(hack.title)}</b>:</p>
      <p style="white-space:pre-wrap">${esc(message)}</p>`)
  )));
  return people.length;
};
