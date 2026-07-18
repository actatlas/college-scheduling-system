function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-unused-vars
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  // eslint-disable-next-line no-console
  console.error('[backend] error:', err);

  res.status(status).json({
    error: message,
    details: err.details || undefined,
  });
}

module.exports = { errorHandler };

