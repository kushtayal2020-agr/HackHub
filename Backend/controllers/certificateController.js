const crypto = require('crypto');
const db = require('../database/db');
const { logAction, ACTIONS } = require('../utils/audit');
const { generateCertificateStream } = require('../utils/certificateGenerator');

// Helper to compute team rank for a hackathon
async function getTeamRank(hackathonId, teamId) {
  const [subs] = await db.query(
    'SELECT s.id, s.team_id FROM submissions s WHERE s.hackathon_id = ?',
    [hackathonId]
  );
  if (subs.length === 0) return null;

  const [scores] = await db.query(
    `SELECT sc.submission_id, sc.judge_id, sc.score, c.weight, c.max_score
     FROM scores sc
     JOIN criteria c ON sc.criterion_id = c.id
     WHERE c.hackathon_id = ?`,
    [hackathonId]
  );

  const subMap = {};
  for (const s of scores) {
    if (!subMap[s.submission_id]) subMap[s.submission_id] = {};
    if (!subMap[s.submission_id][s.judge_id]) subMap[s.submission_id][s.judge_id] = 0;
    subMap[s.submission_id][s.judge_id] += (Number(s.score) / (Number(s.max_score) || 10)) * Number(s.weight);
  }

  const ranked = subs.map(sub => {
    const jMap = subMap[sub.id] || {};
    const jIds = Object.keys(jMap);
    let avg = 0;
    if (jIds.length > 0) {
      avg = jIds.reduce((sum, id) => sum + jMap[id], 0) / jIds.length;
    }
    return { team_id: sub.team_id, score: avg };
  });

  ranked.sort((a, b) => b.score - a.score);

  const idx = ranked.findIndex(r => r.team_id === teamId);
  return idx !== -1 ? idx + 1 : null;
}

// GET /api/hackathons/:id/certificates/info
exports.getCertificateInfo = async (req, res, next) => {
  try {
    const hackathonId = Number(req.params.id);
    const userId = req.user.id;

    // Check hackathon status
    const [hRows] = await db.query(
      'SELECT id, title, results_published, end_date FROM hackathons WHERE id = ?',
      [hackathonId]
    );
    if (hRows.length === 0) {
      return res.status(404).json({ message: 'Hackathon not found.' });
    }
    const hackathon = hRows[0];

    if (!hackathon.results_published) {
      return res.status(400).json({
        eligible: false,
        message: 'Certificates will be generated once official results are published by the organiser.',
      });
    }

    // Check participation
    const [tmRows] = await db.query(
      `SELECT tm.checked_in, t.id AS team_id, t.name AS team_name, (t.leader_id = ?) AS is_leader,
              u.name AS user_name, u.college
       FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       JOIN users u ON tm.user_id = u.id
       WHERE tm.user_id = ? AND tm.hackathon_id = ?`,
      [userId, userId, hackathonId]
    );

    if (tmRows.length === 0) {
      return res.status(404).json({
        eligible: false,
        message: 'You were not registered in any team for this hackathon.',
      });
    }

    const reg = tmRows[0];
    const rank = await getTeamRank(hackathonId, reg.team_id);
    const certId = `CERT-HK${hackathonId}-U${userId}-${crypto.createHash('md5').update(`${hackathonId}-${userId}`).digest('hex').slice(0, 8).toUpperCase()}`;

    let achievement = 'Certificate of Active Participation';
    if (rank === 1) achievement = '1st Place Winner — Certificate of Excellence';
    else if (rank === 2) achievement = '2nd Place Runner Up — Certificate of Merit';
    else if (rank === 3) achievement = '3rd Place — Certificate of Merit';

    res.status(200).json({
      eligible: true,
      recipientName: reg.user_name,
      college: reg.college,
      teamName: reg.team_name,
      roleInTeam: reg.is_leader ? 'leader' : 'member',
      hackathonTitle: hackathon.title,
      rank,
      achievement,
      certificateId: certId,
      issueDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/hackathons/:id/certificates/my-certificate
exports.downloadMyCertificate = async (req, res, next) => {
  try {
    const hackathonId = Number(req.params.id);
    const userId = req.user.id;

    // Check hackathon status
    const [hRows] = await db.query(
      'SELECT id, title, results_published FROM hackathons WHERE id = ?',
      [hackathonId]
    );
    if (hRows.length === 0) {
      return res.status(404).json({ message: 'Hackathon not found.' });
    }
    const hackathon = hRows[0];

    if (!hackathon.results_published) {
      return res.status(400).json({
        message: 'Certificates are released after results are officially published.',
      });
    }

    // Check participation
    const [tmRows] = await db.query(
      `SELECT t.id AS team_id, t.name AS team_name, (t.leader_id = ?) AS is_leader,
              u.name AS user_name, u.college
       FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       JOIN users u ON tm.user_id = u.id
       WHERE tm.user_id = ? AND tm.hackathon_id = ?`,
      [userId, userId, hackathonId]
    );

    if (tmRows.length === 0) {
      return res.status(404).json({ message: 'You were not registered in this hackathon.' });
    }

    const reg = tmRows[0];
    const rank = await getTeamRank(hackathonId, reg.team_id);
    const certId = `CERT-HK${hackathonId}-U${userId}-${crypto.createHash('md5').update(`${hackathonId}-${userId}`).digest('hex').slice(0, 8).toUpperCase()}`;

    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="HackHub-Certificate-${encodeURIComponent(reg.user_name)}.pdf"`);

    const pdfStream = await generateCertificateStream({
      recipientName: reg.user_name,
      recipientCollege: reg.college,
      roleInTeam: reg.is_leader ? 'leader' : 'member',
      teamName: reg.team_name,
      hackathonTitle: hackathon.title,
      rank,
      certificateId: certId,
      issueDate: dateStr,
      verificationUrl: `${req.protocol}://${req.get('host')}/api/certificates/verify/${certId}`,
    });

    logAction(req, ACTIONS.CERTIFICATE_GENERATED, `Certificate ${certId} issued to ${reg.user_name} for hackathon ${hackathonId}`);

    pdfStream.pipe(res);
  } catch (err) {
    next(err);
  }
};

// GET /api/certificates/verify/:certId
exports.verifyCertificate = async (req, res, next) => {
  try {
    const { certId } = req.params;
    // Format: CERT-HK<hId>-U<uId>-<hash>
    const match = certId.match(/^CERT-HK(\d+)-U(\d+)-([A-F0-9]+)$/i);
    if (!match) {
      return res.status(400).json({ valid: false, message: 'Invalid certificate format.' });
    }

    const hackathonId = Number(match[1]);
    const userId = Number(match[2]);

    const [rows] = await db.query(
      `SELECT u.name AS user_name, u.college, h.title AS hackathon_title, h.results_published,
              t.id AS team_id, t.name AS team_name
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       JOIN hackathons h ON tm.hackathon_id = h.id
       JOIN teams t ON tm.team_id = t.id
       WHERE tm.user_id = ? AND tm.hackathon_id = ?`,
      [userId, hackathonId]
    );

    if (rows.length === 0 || !rows[0].results_published) {
      return res.status(404).json({ valid: false, message: 'Certificate record not found or results not published.' });
    }

    const rec = rows[0];
    const rank = await getTeamRank(hackathonId, rec.team_id);

    let titleType = 'Participation';
    if (rank === 1) titleType = '1st Place Winner';
    else if (rank === 2) titleType = '2nd Place Runner Up';
    else if (rank === 3) titleType = '3rd Place';

    res.status(200).json({
      valid: true,
      certificateId: certId,
      recipientName: rec.user_name,
      college: rec.college,
      teamName: rec.team_name,
      hackathonTitle: rec.hackathon_title,
      recognition: titleType,
      rank,
      verifiedAt: new Date(),
    });
  } catch (err) {
    next(err);
  }
};
