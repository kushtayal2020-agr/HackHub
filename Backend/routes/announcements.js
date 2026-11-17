const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const {
  listByHackathon,
  create,
  remove,
} = require('../controllers/announcementController');

const router = express.Router({ mergeParams: true });

router.get(
  '/',
  [param('hackathonId').isInt({ min: 1 }).withMessage('Invalid hackathon ID.')],
  validate,
  listByHackathon
);

router.post(
  '/',
  auth,
  authorize('admin', 'organiser'),
  [
    param('hackathonId').isInt({ min: 1 }).withMessage('Invalid hackathon ID.'),
    body('title')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be 1-200 characters.'),
    body('message').trim().notEmpty().withMessage('Message is required.'),
  ],
  validate,
  create
);

router.delete(
  '/:announcementId',
  auth,
  [
    param('hackathonId').isInt({ min: 1 }).withMessage('Invalid hackathon ID.'),
    param('announcementId').isInt({ min: 1 }).withMessage('Invalid announcement ID.'),
  ],
  validate,
  remove
);

module.exports = router;
