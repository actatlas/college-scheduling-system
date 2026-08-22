function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-unused-vars
  const status = err.statusCode || err.status || (err.code === 'ER_DUP_ENTRY' ? 400 : 500);
  const message = err.code === 'ER_DUP_ENTRY' ? 'Subject or record with this code already exists' : (err.message || 'Internal Server Error');

  // eslint-disable-next-line no-console
  console.error('[backend] error:', err);

  res.status(status).json({
    error: message,
    details: err.details || undefined,
  });
}

module.exports = { errorHandler };

