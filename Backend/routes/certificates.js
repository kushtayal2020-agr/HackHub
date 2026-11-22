const express = require('express');
const { param } = require('express-validator');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const controller = require('../controllers/certificateController');

const router = express.Router();

// Get certificate eligibility & metadata
router.get(
  '/hackathons/:id/certificates/info',
  auth,
  [param('id').isInt({ min: 1 }).withMessage('Valid hackathon ID required.'), validate],
  controller.getCertificateInfo
);

// Download/stream official PDF certificate
router.get(
  '/hackathons/:id/certificates/my-certificate',
  auth,
  [param('id').isInt({ min: 1 }).withMessage('Valid hackathon ID required.'), validate],
  controller.downloadMyCertificate
);

// Public verification endpoint
router.get(
  '/certificates/verify/:certId',
  [param('certId').trim().notEmpty().withMessage('Certificate ID required.'), validate],
  controller.verifyCertificate
);

module.exports = router;
