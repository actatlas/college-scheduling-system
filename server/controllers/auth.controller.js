const { authService } = require('../services/auth.service');

async function authRegister(req, res, next) {
  try {
    const { name, email, password, role, programCode, yearLevel } = req.body;
    const result = await authService.register({
      name,
      email,
      password,
      role,
      programCode,
      yearLevel,
    });
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

async function authLogin(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function authMe(req, res, next) {
  try {
    const result = await authService.getCurrentUser(req.user);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function authForgot(req, res, next) {
  try {
    const { email } = req.body;
    const result = await authService.createResetToken(email);
    // For dev purposes, return token in response. In production, email it instead.
    return res.json({ token: result.token, expiresAt: result.expiresAt });
  } catch (err) {
    return next(err);
  }
}

async function authReset(req, res, next) {
  try {
    const { token, password } = req.body;
    const result = await authService.resetPassword(token, password);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function authChangePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function authUpdateProfile(req, res, next) {
  try {
    const { name, phone } = req.body;
    const result = await authService.updateProfile(req.user.id, { name, phone });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  authRegister,
  authLogin,
  authForgot,
  authReset,
  authMe,
  authChangePassword,
  authUpdateProfile,
};

