const { validationResult } = require('express-validator');

function validateRequest(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const first = result.array()[0];
    const message = first?.msg && first?.path ? `${first.path}: ${first.msg}` : (first?.msg || 'Validation error');
    return res.status(400).json({
      error: message,
    });
  }
  return next();
}

module.exports = { validateRequest };

