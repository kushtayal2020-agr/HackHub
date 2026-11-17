const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const directory = path.join(__dirname, '..', 'uploads', 'banners');
fs.mkdirSync(directory, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: directory,
    filename: (req, file, callback) => {
      callback(null, `${crypto.randomBytes(16).toString('hex')}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!acceptedTypes.includes(file.mimetype)) {
      return callback(new Error('Only JPG, PNG or WEBP images are allowed.'));
    }
    callback(null, true);
  },
});

module.exports = (field) => (req, res, next) => {
  upload.single(field)(req, res, (err) => {
    if (err) {
      err.status = 400;
      if (err.code === 'LIMIT_FILE_SIZE') {
        err.message = 'Image must be under 2 MB.';
      }
      return next(err);
    }
    next();
  });
};
