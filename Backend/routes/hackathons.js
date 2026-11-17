const express = require('express');
const { body, param } = require('express-validator');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');
const uploadBanner = require('../middleware/upload');
const controller = require('../controllers/hackathonController');

const router = express.Router();
const idRule = param('id').isInt({ min: 1 }).withMessage('Invalid hackathon id.');
const rules = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be 3-200 characters.'),
  body('description').optional({ checkFalsy: true }).isString()
    .withMessage('Description must be text.'),
  body('theme').optional({ checkFalsy: true }).trim().isLength({ max: 100 })
    .withMessage('Theme must be at most 100 characters.'),
  body('rules').optional({ checkFalsy: true }).isString()
    .withMessage('Rules must be text.'),
  body('prizes').optional({ checkFalsy: true }).trim().isLength({ max: 255 })
    .withMessage('Prizes must be at most 255 characters.'),
  body('registration_start')
    .isISO8601()
    .withMessage('Enter a valid registration start date.'),
  body('registration_end')
    .isISO8601()
    .withMessage('Enter a valid registration end date.')
    .bail()
    .custom((value, { req }) => new Date(value) > new Date(req.body.registration_start))
    .withMessage('Registration end must be after registration start.'),
  body('start_date').isISO8601().withMessage('Enter a valid start date.'),
  body('end_date')
    .isISO8601()
    .withMessage('Enter a valid end date.')
    .bail()
    .custom((value, { req }) => new Date(value) >= new Date(req.body.start_date))
    .withMessage('End date must not be before the start date.'),
  body('max_team_size').optional({ checkFalsy: true }).isInt({ min: 1, max: 10 })
    .withMessage('Team size must be between 1 and 10.'),
];

router.get('/', controller.getAllHackathons);
router.get('/themes', controller.getThemes);
router.get('/mine', auth, authorize('organiser'), controller.getMyHackathons);
router.get(
  '/mine/:id',
  auth,
  authorize('organiser'),
  idRule,
  validate,
  controller.getMyHackathonById
);
router.get('/:id', idRule, validate, controller.getHackathonById);
router.post(
  '/',
  auth,
  authorize('organiser'),
  uploadBanner('banner'),
  rules,
  validate,
  controller.createHackathon
);
router.put(
  '/:id',
  auth,
  authorize('organiser'),
  idRule,
  uploadBanner('banner'),
  rules,
  validate,
  controller.updateHackathon
);
router.delete(
  '/:id',
  auth,
  authorize('organiser', 'admin'),
  idRule,
  validate,
  controller.deleteHackathon
);

module.exports = router;
