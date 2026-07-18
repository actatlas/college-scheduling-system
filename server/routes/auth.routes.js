const express = require('express');
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validateRequest');
const { authRegister, authLogin, authForgot, authReset, authMe } = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').isString().isLength({ min: 2, max: 120 }),
    body('email').isEmail(),
    body('password').isString().isLength({ min: 6, max: 200 }),
    body('role').optional().isString(),
    body('programCode').optional().isString().isLength({ min: 2, max: 30 }),
    body('yearLevel').optional().isString().isLength({ min: 1, max: 30 }),
  ],
  validateRequest,
  authRegister
);

router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').isString().isLength({ min: 6, max: 200 }),
  ],
  validateRequest,
  authLogin
);

router.post(
  '/forgot',
  [body('email').isEmail()],
  validateRequest,
  authForgot
);

router.post(
  '/reset',
  [body('token').isString(), body('password').isString().isLength({ min: 6 })],
  validateRequest,
  authReset
);

router.get('/me', authMiddleware, authMe);

module.exports = router;

