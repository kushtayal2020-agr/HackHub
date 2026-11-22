const db = require('../database/db');
const { logAction, ACTIONS } = require('../utils/audit');

const STATUS_SQL = `(CASE
  WHEN NOW() < h.start_date THEN 'upcoming'
  WHEN NOW() <= h.end_date THEN 'live'
  ELSE 'completed'
END)`;

// Helper: verify organiser or admin permission for hackathon
async function verifyOrganiserOrAdmin(req, hackathonId) {
  if (req.user.role === 'admin') return true;
  const [h] = await db.query('SELECT organiser_id FROM hackathons WHERE id = ?', [hackathonId]);
  if (h.length === 0 || h[0].organiser_id !== req.user.id) {
    const err = new Error('Access denied. You do not manage this hackathon.');
    err.status = 403;
    throw err;
  }
  return true;
}

// =========================================================================
// 1. RUBRIC CRITERIA
// =========================================================================

// GET /api/hackathons/:id/rubric
exports.getRubric = async (req, res, next) => {
  try {
    const hackathonId = Number(req.params.id);
    const [criteria] = await db.query(
      'SELECT id, name, weight, max_score FROM criteria WHERE hackathon_id = ? ORDER BY id ASC',
      [hackathonId]
    );

    const totalWeight = criteria.reduce((sum, c) => sum + Number(c.weight), 0);

    res.status(200).json({
      hackathon_id: hackathonId,
      total_weight: Math.round(totalWeight),
      criteria,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/hackathons/:id/rubric
exports.setRubric = async (req, res, next) => {
  try {
    const hackathonId = Number(req.params.id);
    await verifyOrganiserOrAdmin(req, hackathonId);

    const { criteria } = req.body;
    if (!Array.isArray(criteria) || criteria.length === 0) {
      return res.status(400).json({ message: 'At least one evaluation criterion is required.' });
    }

    // Validate weights sum to 100
    let totalWeight = 0;
    for (const c of criteria) {
      if (!c.name || typeof c.name !== 'string' || c.name.trim().length < 2) {
        return res.status(400).json({ message: 'Each criterion must have a name (at least 2 characters).' });
      }
      const w = Number(c.weight);
      if (isNaN(w) || w <= 0) {
        return res.status(400).json({ message: 'Each criterion must have a positive weight.' });
      }
      totalWeight += w;
    }

    if (Math.round(totalWeight) !== 100) {
      return res.status(400).json({
        message: `Criterion weights must sum to exactly 100%. Current total: ${Math.round(totalWeight)}%.`,
      });
    }

    // Check if scores have already been recorded with existing criteria
    const [existingScores] = await db.query(
      `SELECT sc.id FROM scores sc
       JOIN criteria c ON sc.criterion_id = c.id
       WHERE c.hackathon_id = ? LIMIT 1`,
      [hackathonId]
    );
    if (existingScores.length > 0 && req.user.role !== 'admin') {
      return res.status(400).json({
        message: 'Cannot modify rubric criteria because scores have already been submitted by judges.',
      });
    }

    // Delete existing criteria and replace
    await db.query('DELETE FROM criteria WHERE hackathon_id = ?', [hackathonId]);

    for (const c of criteria) {
      await db.query(
        'INSERT INTO criteria (hackathon_id, name, weight, max_score) VALUES (?, ?, ?, ?)',
        [hackathonId, c.name.trim(), Number(c.weight), Number(c.max_score) || 10]
      );
    }

    logAction(req, ACTIONS.RUBRIC_UPDATED, `Rubric criteria updated for hackathon ${hackathonId} (${criteria.length} criteria)`);

    const [saved] = await db.query('SELECT * FROM criteria WHERE hackathon_id = ?', [hackathonId]);

    res.status(200).json({
      message: 'Rubric criteria saved successfully!',
      criteria: saved,
    });
  } catch (err) {
    next(err);
  }
};

// =========================================================================
// 2. JUDGE ASSIGNMENTS
// =========================================================================

// GET /api/hackathons/:id/judges
exports.getJudges = async (req, res, next) => {
  try {
    const hackathonId = Number(req.params.id);

    const [judges] = await db.query(
      `SELECT ja.id AS assignment_id, ja.assigned_at,
              u.id AS judge_id, u.name, u.email, u.college, u.skills, u.avatar_path,
              (SELECT COUNT(DISTINCT sc.submission_id)
               FROM scores sc
               JOIN submissions s ON sc.submission_id = s.id
               WHERE sc.judge_id = u.id AND s.hackathon_id = ?) AS evaluated_count
       FROM judge_assignments ja
       JOIN users u ON ja.judge_id = u.id
       WHERE ja.hackathon_id = ?
       ORDER BY ja.assigned_at ASC`,
      [hackathonId, hackathonId]
    );

    res.status(200).json(judges);
  } catch (err) {
    next(err);
  }
};

// POST /api/hackathons/:id/judges
exports.assignJudge = async (req, res, next) => {
  try {
    const hackathonId = Number(req.params.id);
    await verifyOrganiserOrAdmin(req, hackathonId);

    const { email, judgeId } = req.body;
    if (!email && !judgeId) {
      return res.status(400).json({ message: 'Provide judge email or judge ID.' });
    }

    let userQuery = 'SELECT id, name, email, role, college FROM users WHERE ';
    const params = [];
    if (email) {
      userQuery += 'email = ?';
      params.push(email.trim().toLowerCase());
    } else {
      userQuery += 'id = ?';
      params.push(Number(judgeId));
    }

    const [users] = await db.query(userQuery, params);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const judgeUser = users[0];

    // Ensure role is judge or promote/allow
    if (judgeUser.role !== 'judge' && judgeUser.role !== 'admin') {
      return res.status(400).json({
        message: `User ${judgeUser.name} has role "${judgeUser.role}". Only users with the "judge" role can be assigned.`,
      });
    }

    // Check duplicate assignment
    const [existing] = await db.query(
      'SELECT id FROM judge_assignments WHERE hackathon_id = ? AND judge_id = ?',
      [hackathonId, judgeUser.id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: `Judge ${judgeUser.name} is already assigned to this hackathon.` });
    }

    await db.query(
      'INSERT INTO judge_assignments (hackathon_id, judge_id) VALUES (?, ?)',
      [hackathonId, judgeUser.id]
    );

    logAction(
      req,
      ACTIONS.JUDGE_ASSIGNED,
      `Assigned judge ${judgeUser.name} (${judgeUser.email}) to hackathon ${hackathonId}`
    );

    res.status(201).json({
      message: `Judge ${judgeUser.name} successfully assigned!`,
      judge: judgeUser,
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/hackathons/:id/judges/:judgeId
exports.removeJudge = async (req, res, next) => {
  try {
    const hackathonId = Number(req.params.id);
    const targetJudgeId = Number(req.params.judgeId);
    await verifyOrganiserOrAdmin(req, hackathonId);

    await db.query(
      'DELETE FROM judge_assignments WHERE hackathon_id = ? AND judge_id = ?',
      [hackathonId, targetJudgeId]
    );

    res.status(200).json({ message: 'Judge unassigned from hackathon.' });
  } catch (err) {
    next(err);
  }
};

// =========================================================================
// 3. JUDGE DASHBOARD & QUEUE
// =========================================================================

// GET /api/judges/dashboard
exports.getJudgeDashboard = async (req, res, next) => {
  try {
    const judgeId = req.user.id;

    // Fetch assigned hackathons
    const [hackathons] = await db.query(
      `SELECT h.id, h.title, h.theme, h.start_date, h.end_date, h.banner_path, h.results_published,
              ${STATUS_SQL} AS status,
              (SELECT COUNT(*) FROM submissions s WHERE s.hackathon_id = h.id) AS total_submissions,
              (SELECT COUNT(DISTINCT sc.submission_id)
               FROM scores sc
               JOIN submissions s2 ON sc.submission_id = s2.id
               WHERE sc.judge_id = ? AND s2.hackathon_id = h.id) AS evaluated_submissions,
              (SELECT COUNT(*) FROM criteria c WHERE c.hackathon_id = h.id) AS criteria_count
       FROM judge_assignments ja
       JOIN hackathons h ON ja.hackathon_id = h.id
       WHERE ja.judge_id = ?
       ORDER BY h.start_date DESC`,
      [judgeId, judgeId]
    );

    res.status(200).json(hackathons);
  } catch (err) {
    next(err);
  }
};

// GET /api/hackathons/:id/judging/queue
exports.getJudgingQueue = async (req, res, next) => {
  try {
    const hackathonId = Number(req.params.id);
    const judgeId = req.user.id;

    // Check judge assignment
    if (req.user.role !== 'admin') {
      const [ja] = await db.query(
        'SELECT id FROM judge_assignments WHERE hackathon_id = ? AND judge_id = ?',
        [hackathonId, judgeId]
      );
      if (ja.length === 0) {
        return res.status(403).json({ message: 'You are not assigned as a judge for this hackathon.' });
      }
    }

    const [subs] = await db.query(
      `SELECT s.id, s.title, s.description, s.github_url, s.demo_url, s.file_path, s.submitted_at,
              t.name AS team_name, u.name AS leader_name,
              (SELECT COUNT(*) FROM scores sc WHERE sc.submission_id = s.id AND sc.judge_id = ?) > 0 AS evaluated_by_me
       FROM submissions s
       JOIN teams t ON s.team_id = t.id
       JOIN users u ON t.leader_id = u.id
       WHERE s.hackathon_id = ?
       ORDER BY evaluated_by_me ASC, s.submitted_at ASC`,
      [judgeId, hackathonId]
    );

    // Fetch rubric criteria
    const [criteria] = await db.query('SELECT * FROM criteria WHERE hackathon_id = ?', [hackathonId]);

    res.status(200).json({
      hackathon_id: hackathonId,
      criteria,
      submissions: subs,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/submissions/:id/judging
exports.getSubmissionJudgingData = async (req, res, next) => {
  try {
    const submissionId = Number(req.params.id);
    const judgeId = req.user.id;

    const [sRows] = await db.query(
      `SELECT s.*, t.name AS team_name, h.id AS hackathon_id, h.title AS hackathon_title,
              h.results_published, ${STATUS_SQL} AS hackathon_status
       FROM submissions s
       JOIN teams t ON s.team_id = t.id
       JOIN hackathons h ON s.hackathon_id = h.id
       WHERE s.id = ?`,
      [submissionId]
    );
    if (sRows.length === 0) {
      return res.status(404).json({ message: 'Submission not found.' });
    }
    const sub = sRows[0];

    // Check assignment
    if (req.user.role !== 'admin') {
      const [ja] = await db.query(
        'SELECT id FROM judge_assignments WHERE hackathon_id = ? AND judge_id = ?',
        [sub.hackathon_id, judgeId]
      );
      if (ja.length === 0) {
        return res.status(403).json({ message: 'You are not assigned to evaluate this hackathon.' });
      }
    }

    // Fetch criteria
    const [criteria] = await db.query(
      'SELECT id, name, weight, max_score FROM criteria WHERE hackathon_id = ? ORDER BY id ASC',
      [sub.hackathon_id]
    );

    // Fetch judge's existing scores for this submission
    const [myScores] = await db.query(
      'SELECT criterion_id, score, comment FROM scores WHERE submission_id = ? AND judge_id = ?',
      [submissionId, judgeId]
    );

    // Fetch team members
    const [members] = await db.query(
      `SELECT u.name, u.email, u.college, u.skills
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = ?`,
      [sub.team_id]
    );

    res.status(200).json({
      submission: sub,
      members,
      criteria,
      myScores,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/submissions/:id/score
exports.submitScores = async (req, res, next) => {
  try {
    const submissionId = Number(req.params.id);
    const judgeId = req.user.id;
    const { scores, comment } = req.body;

    if (!Array.isArray(scores) || scores.length === 0) {
      return res.status(400).json({ message: 'Scores array is required.' });
    }

    const [sRows] = await db.query(
      'SELECT s.hackathon_id, s.title, t.name AS team_name FROM submissions s JOIN teams t ON s.team_id = t.id WHERE s.id = ?',
      [submissionId]
    );
    if (sRows.length === 0) {
      return res.status(404).json({ message: 'Submission not found.' });
    }
    const sub = sRows[0];

    // Check assignment
    if (req.user.role !== 'admin') {
      const [ja] = await db.query(
        'SELECT id FROM judge_assignments WHERE hackathon_id = ? AND judge_id = ?',
        [sub.hackathon_id, judgeId]
      );
      if (ja.length === 0) {
        return res.status(403).json({ message: 'You are not assigned to score this hackathon.' });
      }
    }

    // Fetch criteria for validation
    const [criteria] = await db.query('SELECT * FROM criteria WHERE hackathon_id = ?', [sub.hackathon_id]);
    const criteriaMap = {};
    for (const c of criteria) criteriaMap[c.id] = c;

    let weightedSum = 0;
    for (const item of scores) {
      const c = criteriaMap[item.criterion_id];
      if (!c) {
        return res.status(400).json({ message: `Invalid criterion ID: ${item.criterion_id}` });
      }
      const val = Number(item.score);
      if (isNaN(val) || val < 0 || val > c.max_score) {
        return res.status(400).json({
          message: `Score for "${c.name}" must be between 0 and ${c.max_score}.`,
        });
      }
      // Calculate weighted contribution
      weightedSum += (val / c.max_score) * Number(c.weight);

      // Upsert score record
      const [existing] = await db.query(
        'SELECT id FROM scores WHERE submission_id = ? AND judge_id = ? AND criterion_id = ?',
        [submissionId, judgeId, c.id]
      );

      const itemComment = item.comment || comment || null;

      if (existing.length > 0) {
        await db.query(
          'UPDATE scores SET score = ?, comment = ?, scored_at = NOW() WHERE id = ?',
          [val, itemComment, existing[0].id]
        );
      } else {
        await db.query(
          'INSERT INTO scores (submission_id, judge_id, criterion_id, score, comment) VALUES (?, ?, ?, ?, ?)',
          [submissionId, judgeId, c.id, val, itemComment]
        );
      }
    }

    logAction(
      req,
      ACTIONS.SCORE_SUBMITTED,
      `Judge ${judgeId} evaluated submission "${sub.title}" (${Math.round(weightedSum)}/100)`
    );

    res.status(200).json({
      message: 'Scores submitted successfully!',
      totalWeightedScore: Math.round(weightedSum * 100) / 100,
    });
  } catch (err) {
    next(err);
  }
};

// =========================================================================
// 4. LEADERBOARD & RESULTS PUBLISHING
// =========================================================================

// GET /api/hackathons/:id/leaderboard
exports.getLeaderboard = async (req, res, next) => {
  try {
    const hackathonId = Number(req.params.id);

    // Fetch hackathon info
    const [hRows] = await db.query(
      `SELECT h.id, h.title, h.theme, h.results_published, h.start_date, h.end_date,
              ${STATUS_SQL} AS status
       FROM hackathons h WHERE h.id = ?`,
      [hackathonId]
    );
    if (hRows.length === 0) {
      return res.status(404).json({ message: 'Hackathon not found.' });
    }
    const hackathon = hRows[0];

    // Fetch rubric criteria
    const [criteria] = await db.query('SELECT * FROM criteria WHERE hackathon_id = ?', [hackathonId]);

    // Fetch all submissions for this hackathon
    const [subs] = await db.query(
      `SELECT s.id, s.title, s.description, s.github_url, s.demo_url, s.submitted_at,
              t.id AS team_id, t.name AS team_name,
              u.name AS leader_name, u.college AS leader_college
       FROM submissions s
       JOIN teams t ON s.team_id = t.id
       JOIN users u ON t.leader_id = u.id
       WHERE s.hackathon_id = ?`,
      [hackathonId]
    );

    // Fetch all scores for these submissions
    const [allScores] = await db.query(
      `SELECT sc.submission_id, sc.judge_id, sc.criterion_id, sc.score,
              c.weight, c.max_score
       FROM scores sc
       JOIN criteria c ON sc.criterion_id = c.id
       WHERE c.hackathon_id = ?`,
      [hackathonId]
    );

    // Group scores by submission -> judge -> weighted sum
    const subScoresMap = {};
    for (const row of allScores) {
      if (!subScoresMap[row.submission_id]) subScoresMap[row.submission_id] = {};
      if (!subScoresMap[row.submission_id][row.judge_id]) subScoresMap[row.submission_id][row.judge_id] = 0;

      const frac = Number(row.score) / (Number(row.max_score) || 10);
      subScoresMap[row.submission_id][row.judge_id] += frac * Number(row.weight);
    }

    // Compute leaderboard ranks
    const rankedList = subs.map(sub => {
      const judgeMap = subScoresMap[sub.id] || {};
      const judgeIds = Object.keys(judgeMap);
      const judgeCount = judgeIds.length;

      let avgWeightedScore = 0;
      if (judgeCount > 0) {
        const sumOfJudges = judgeIds.reduce((sum, jId) => sum + judgeMap[jId], 0);
        avgWeightedScore = sumOfJudges / judgeCount;
      }

      return {
        submission_id: sub.id,
        title: sub.title,
        description: sub.description,
        github_url: sub.github_url,
        demo_url: sub.demo_url,
        team_id: sub.team_id,
        team_name: sub.team_name,
        leader_name: sub.leader_name,
        leader_college: sub.leader_college,
        judges_evaluated_count: judgeCount,
        score: Math.round(avgWeightedScore * 100) / 100,
        submitted_at: sub.submitted_at,
      };
    });

    // Sort descending by score, then earlier submission time
    rankedList.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.submitted_at) - new Date(b.submitted_at);
    });

    // Assign rank
    rankedList.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    res.status(200).json({
      hackathon: {
        id: hackathon.id,
        title: hackathon.title,
        theme: hackathon.theme,
        status: hackathon.status,
        results_published: !!hackathon.results_published,
      },
      criteria_count: criteria.length,
      total_submissions: rankedList.length,
      leaderboard: rankedList,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/hackathons/:id/publish-results
exports.publishResults = async (req, res, next) => {
  try {
    const hackathonId = Number(req.params.id);
    await verifyOrganiserOrAdmin(req, hackathonId);

    await db.query('UPDATE hackathons SET results_published = 1 WHERE id = ?', [hackathonId]);

    logAction(req, ACTIONS.RESULTS_PUBLISHED, `Results published for hackathon ${hackathonId}`);

    res.status(200).json({
      message: 'Hackathon results published successfully! The leaderboard is now visible to all participants.',
    });
  } catch (err) {
    next(err);
  }
};
