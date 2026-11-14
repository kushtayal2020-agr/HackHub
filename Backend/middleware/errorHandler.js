// Central error handler: every next(err) ends up here
module.exports = function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({ message: 'This record already exists.' });
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ message: 'Related record not found.' });
  }

  const status = err.status || 500;
  res.status(status).json({
    message: status === 500 ? 'Something went wrong on the server.' : err.message,
  });
};
