const express = require('express');
const { param, body } = require('express-validator');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');
const { uploadSubmissionFile } = require('../middleware/uploadFactory');
const controller = require('../controllers/submissionController');

const router = express.Router();

// Submit project for hackathon
router.post(
  '/hackathons/:id/submissions',
  auth,
  authorize('participant'),
  uploadSubmissionFile('file'),
  [
    param('id').isInt({ min: 1 }).withMessage('Valid hackathon ID required.'),
    body('title')
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage('Project title must be between 3 and 200 characters.'),
    body('github_url')
      .trim()
      .isURL()
      .withMessage('Valid GitHub/repository URL is required.'),
    body('demo_url')
      .optional({ checkFalsy: true })
      .trim()
      .isURL()
      .withMessage('Valid demo URL required if provided.'),
    validate,
  ],
  controller.createSubmission
);

// Update existing project submission
router.put(
  '/submissions/:id',
  auth,
  uploadSubmissionFile('file'),
  [
    param('id').isInt({ min: 1 }).withMessage('Valid submission ID required.'),
    body('title')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage('Project title must be between 3 and 200 characters.'),
    body('github_url')
      .optional({ checkFalsy: true })
      .trim()
      .isURL()
      .withMessage('Valid GitHub/repository URL is required.'),
    body('demo_url')
      .optional({ checkFalsy: true })
      .trim()
      .isURL()
      .withMessage('Valid demo URL required if provided.'),
    validate,
  ],
  controller.updateSubmission
);

// Current user's team submission for a specific hackathon
router.get(
  '/hackathons/:id/submissions/mine',
  auth,
  [param('id').isInt({ min: 1 }).withMessage('Valid hackathon ID required.'), validate],
  controller.getMySubmissionForHackathon
);

// All submissions across all hackathons for current participant
router.get('/submissions/mine', auth, authorize('participant'), controller.getMySubmissions);

// All submissions for a hackathon (organiser/judges/admin)
router.get(
  '/hackathons/:id/submissions',
  auth,
  [param('id').isInt({ min: 1 }).withMessage('Valid hackathon ID required.'), validate],
  controller.getHackathonSubmissions
);

// Single submission details
router.get(
  '/submissions/:id',
  auth,
  [param('id').isInt({ min: 1 }).withMessage('Valid submission ID required.'), validate],
  controller.getSubmissionById
);

// Withdraw/delete project submission
router.delete(
  '/submissions/:id',
  auth,
  [param('id').isInt({ min: 1 }).withMessage('Valid submission ID required.'), validate],
  controller.deleteSubmission
);

module.exports = router;
