const express = require('express');
const { param, body } = require('express-validator');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');
const controller = require('../controllers/judgingController');

const router = express.Router();

// --- Rubric ---
router.get(
  '/hackathons/:id/rubric',
  [param('id').isInt({ min: 1 }).withMessage('Valid hackathon ID required.'), validate],
  controller.getRubric
);

router.post(
  '/hackathons/:id/rubric',
  auth,
  authorize('organiser', 'admin'),
  [param('id').isInt({ min: 1 }).withMessage('Valid hackathon ID required.'), validate],
  controller.setRubric
);

// --- Judges ---
router.get(
  '/hackathons/:id/judges',
  auth,
  [param('id').isInt({ min: 1 }).withMessage('Valid hackathon ID required.'), validate],
  controller.getJudges
);

router.post(
  '/hackathons/:id/judges',
  auth,
  authorize('organiser', 'admin'),
  [param('id').isInt({ min: 1 }).withMessage('Valid hackathon ID required.'), validate],
  controller.assignJudge
);

router.delete(
  '/hackathons/:id/judges/:judgeId',
  auth,
  authorize('organiser', 'admin'),
  [
    param('id').isInt({ min: 1 }).withMessage('Valid hackathon ID required.'),
    param('judgeId').isInt({ min: 1 }).withMessage('Valid judge ID required.'),
    validate,
  ],
  controller.removeJudge
);

// --- Judge Dashboard & Scoring ---
router.get('/judges/dashboard', auth, authorize('judge', 'admin'), controller.getJudgeDashboard);

router.get(
  '/hackathons/:id/judging/queue',
  auth,
  authorize('judge', 'admin'),
  [param('id').isInt({ min: 1 }).withMessage('Valid hackathon ID required.'), validate],
  controller.getJudgingQueue
);

router.get(
  '/submissions/:id/judging',
  auth,
  authorize('judge', 'admin'),
  [param('id').isInt({ min: 1 }).withMessage('Valid submission ID required.'), validate],
  controller.getSubmissionJudgingData
);

router.post(
  '/submissions/:id/score',
  auth,
  authorize('judge', 'admin'),
  [param('id').isInt({ min: 1 }).withMessage('Valid submission ID required.'), validate],
  controller.submitScores
);

// --- Leaderboard & Results Publishing ---
router.get(
  '/hackathons/:id/leaderboard',
  [param('id').isInt({ min: 1 }).withMessage('Valid hackathon ID required.'), validate],
  controller.getLeaderboard
);

router.post(
  '/hackathons/:id/publish-results',
  auth,
  authorize('organiser', 'admin'),
  [param('id').isInt({ min: 1 }).withMessage('Valid hackathon ID required.'), validate],
  controller.publishResults
);

module.exports = router;
