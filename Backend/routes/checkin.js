const express = require('express');
const { param, body } = require('express-validator');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');
const controller = require('../controllers/checkinController');

const router = express.Router();

// Participant views their own check-in QR code pass
router.get(
  '/hackathons/:id/my-checkin-qr',
  auth,
  [param('id').isInt({ min: 1 }).withMessage('Valid hackathon ID required.'), validate],
  controller.getMyCheckinQr
);

// Organiser / Admin scans or enters check-in code to verify participant
router.post(
  '/hackathons/:id/checkin',
  auth,
  authorize('organiser', 'admin'),
  [param('id').isInt({ min: 1 }).withMessage('Valid hackathon ID required.'), validate],
  controller.checkinParticipant
);

// Organiser / Admin views attendance analytics & registered participant check-in status
router.get(
  '/hackathons/:id/checkins',
  auth,
  authorize('organiser', 'admin'),
  [param('id').isInt({ min: 1 }).withMessage('Valid hackathon ID required.'), validate],
  controller.getCheckinStats
);

module.exports = router;
