const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Ensure destination directories exist
const avatarDir = path.join(__dirname, '..', 'uploads', 'avatars');
const submissionDir = path.join(__dirname, '..', 'uploads', 'submissions');
fs.mkdirSync(avatarDir, { recursive: true });
fs.mkdirSync(submissionDir, { recursive: true });

// Avatar upload (JPG, PNG, WEBP, max 2MB)
const avatarStorage = multer.diskStorage({
  destination: avatarDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = crypto.randomBytes(12).toString('hex');
    cb(null, `avatar-${req.user ? req.user.id : 'anon'}-${Date.now()}-${unique}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const accepted = ['image/jpeg', 'image/png', 'image/webp'];
    if (!accepted.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, or WEBP images are allowed for avatars.'));
    }
    cb(null, true);
  },
});

// Submission upload (ZIP, PDF, max 25MB)
const submissionStorage = multer.diskStorage({
  destination: submissionDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = crypto.randomBytes(12).toString('hex');
    cb(null, `sub-${Date.now()}-${unique}${ext}`);
  },
});

const submissionUpload = multer({
  storage: submissionStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const accepted = [
      'application/zip',
      'application/x-zip-compressed',
      'application/pdf',
      'application/octet-stream',
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!accepted.includes(file.mimetype) && !['.zip', '.pdf'].includes(ext)) {
      return cb(new Error('Only ZIP archives or PDF documentation are allowed.'));
    }
    cb(null, true);
  },
});

module.exports = {
  uploadAvatar: (field = 'avatar') => (req, res, next) => {
    avatarUpload.single(field)(req, res, (err) => {
      if (err) {
        err.status = 400;
        if (err.code === 'LIMIT_FILE_SIZE') {
          err.message = 'Avatar image must be under 2 MB.';
        }
        return next(err);
      }
      next();
    });
  },
  uploadSubmissionFile: (field = 'file') => (req, res, next) => {
    submissionUpload.single(field)(req, res, (err) => {
      if (err) {
        err.status = 400;
        if (err.code === 'LIMIT_FILE_SIZE') {
          err.message = 'Project file must be under 25 MB.';
        }
        return next(err);
      }
      next();
    });
  },
};
