const express = require('express');
const { param, body } = require('express-validator');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');
const adminController = require('../controllers/adminController');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(auth, authorize('admin'));

// 1. GET /api/admin/stats
router.get('/stats', adminController.getStats);

// 2. GET /api/admin/users
router.get('/users', adminController.getUsers);

// 3. PATCH /api/admin/users/:id/block
router.patch(
  '/users/:id/block',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid user ID.'),
    body('blocked').isBoolean().withMessage('blocked must be true or false.'),
  ],
  validate,
  adminController.toggleUserBlock
);

// 4. PATCH /api/admin/users/:id/approval
router.patch(
  '/users/:id/approval',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid user ID.'),
    body('approved').isBoolean().withMessage('approved must be true or false.'),
  ],
  validate,
  adminController.updateOrganiserApproval
);

// 5. PATCH /api/admin/users/:id/role
router.patch(
  '/users/:id/role',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid user ID.'),
    body('role').isIn(['admin', 'organiser', 'judge', 'participant']).withMessage('Invalid role specified.'),
  ],
  validate,
  adminController.updateUserRole
);

// 6. DELETE /api/admin/users/:id
router.delete(
  '/users/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid user ID.'),
  ],
  validate,
  adminController.deleteUser
);

// 7. GET /api/admin/hackathons
router.get('/hackathons', adminController.getHackathons);

// 8. PATCH /api/admin/hackathons/:id/approval
router.patch(
  '/hackathons/:id/approval',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid hackathon ID.'),
    body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected.'),
    body('reason').optional().trim(),
  ],
  validate,
  adminController.updateHackathonApproval
);

// 9. GET /api/admin/audit-logs
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
