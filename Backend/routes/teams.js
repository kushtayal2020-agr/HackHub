const express = require('express');
const { body, param } = require('express-validator');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');
const controller = require('../controllers/teamController');

const router = express.Router();

// Create team in hackathon
router.post(
  '/hackathons/:id/teams',
  auth,
  authorize('participant'),
  [
    param('id').isInt({ min: 1 }).withMessage('Valid hackathon ID required.'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Team name must be 2 to 100 characters.'),
    validate,
  ],
  controller.createTeam
);

// Join existing team with invite code
router.post(
  '/teams/join',
  auth,
  authorize('participant'),
  [
    body('invite_code')
      .trim()
      .isLength({ min: 4, max: 12 })
      .withMessage('Valid invite code is required.'),
    validate,
  ],
  controller.joinTeam
);

// Current user's team in a specific hackathon
router.get(
  '/hackathons/:id/my-team',
  auth,
  [param('id').isInt({ min: 1 }).withMessage('Valid hackathon ID required.'), validate],
  controller.getMyTeamForHackathon
);

// All teams current user is member of
router.get('/teams/mine', auth, controller.getMyTeams);

// Leave team
router.delete(
  '/teams/:id/leave',
  auth,
  [param('id').isInt({ min: 1 }).withMessage('Valid team ID required.'), validate],
  controller.leaveTeam
);

// Remove member (leader only)
router.delete(
  '/teams/:id/members/:userId',
  auth,
  [
    param('id').isInt({ min: 1 }).withMessage('Valid team ID required.'),
    param('userId').isInt({ min: 1 }).withMessage('Valid user ID required.'),
    validate,
  ],
  controller.removeMember
);

// Regenerate invite code (leader only)
router.post(
  '/teams/:id/invite',
  auth,
  [param('id').isInt({ min: 1 }).withMessage('Valid team ID required.'), validate],
  controller.regenerateInviteCode
);

// List all teams for a hackathon (organiser/admin)
router.get(
  '/hackathons/:id/teams',
  auth,
  authorize('organiser', 'admin'),
  [param('id').isInt({ min: 1 }).withMessage('Valid hackathon ID required.'), validate],
  controller.getHackathonTeams
);

module.exports = router;
