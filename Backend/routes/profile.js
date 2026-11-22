const express = require('express');
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uploadAvatar } = require('../middleware/uploadFactory');
const controller = require('../controllers/profileController');

const router = express.Router();

// Get current user profile
router.get('/', auth, controller.getProfile);

// Update profile details
router.put(
  '/',
  auth,
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters.'),
    body('college').optional({ checkFalsy: true }).trim().isLength({ max: 150 }),
    body('skills').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
    body('github_url').optional({ checkFalsy: true }).trim().isURL().withMessage('Enter a valid GitHub URL.'),
    validate,
  ],
  controller.updateProfile
);

// Upload profile avatar
router.post('/avatar', auth, uploadAvatar('avatar'), controller.updateAvatar);

// Change password
router.patch(
  '/password',
  auth,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required.'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long.'),
    validate,
  ],
  controller.changePassword
);

module.exports = router;
