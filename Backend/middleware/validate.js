const { validationResult } = require('express-validator');

// Put after express-validator rules; returns 400 with a list of errors
module.exports = function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({
      message: result.array()[0].msg,
      errors: result.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};
