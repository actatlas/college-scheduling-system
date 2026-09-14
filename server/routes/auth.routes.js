const express = require('express');
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validateRequest');
const {
  authRegister,
  authLogin,
  authLogout,
  authForgot,
  authReset,
  authMe,
  authChangePassword,
  authUpdateProfile,
} = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').isString().isLength({ min: 2, max: 120 }),
    body('email').isEmail(),
    body('password').isString().isLength({ min: 6, max: 200 }),
    body('role').optional().isString(),
  ],
  validateRequest,
  authRegister
);

router.post(
  '/login',
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
router.post('/logout', authMiddleware, authLogout);

router.post(
  '/change-password',
  authMiddleware,
  [
    body('currentPassword').isString().isLength({ min: 1 }),
    body('newPassword').isString().isLength({ min: 6 }),
  ],
  validateRequest,
  authChangePassword
);

router.put(
  '/profile',
  authMiddleware,
  [
    body('name').optional().isString().isLength({ min: 2, max: 120 }),
    body('phone').optional().isString(),
  ],
  validateRequest,
  authUpdateProfile
);

module.exports = router;

