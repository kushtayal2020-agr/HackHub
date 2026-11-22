const express = require('express');
const { body, param } = require('express-validator');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');
const controller = require('../controllers/announcementController');

const router = express.Router();
const hackathonId = param('id').isInt({ min: 1 }).withMessage('Invalid hackathon id.');
const announcementId = param('id').isInt({ min: 1 }).withMessage('Invalid announcement id.');
const announcementBody = [
  body('title').trim().isLength({ min: 3, max: 200 })
    .withMessage('Title must be 3-200 characters.'),
  body('message').trim().isLength({ min: 5, max: 2000 })
    .withMessage('Message must be 5-2000 characters.'),
];

router.post(
  '/hackathons/:id/announcements',
  auth,
  authorize('organiser'),
  hackathonId,
  announcementBody,
  validate,
  controller.createAnnouncement
);
router.get('/hackathons/:id/announcements', hackathonId, validate, controller.getAnnouncements);
router.delete(
  '/announcements/:id',
  auth,
  authorize('organiser', 'admin'),
  announcementId,
  validate,
  controller.deleteAnnouncement
);

module.exports = router;
