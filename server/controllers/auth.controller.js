const { authService } = require('../services/auth.service');
const { logAction } = require('../services/systemLogs.service');

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

    await logAction({
      req,
      user: result.user,
      module: 'Authentication',
      action: 'User Registered',
      description: `Registered user account for ${name} (${email}) with role ${role || 'student'}.`,
      targetId: result.user?.id,
      targetType: 'User',
      status: 'Success',
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

    await logAction({
      req,
      user: result.user,
      module: 'Authentication',
      action: 'User Login',
      description: `User ${result.user?.name || email} successfully logged into the system.`,
      targetId: result.user?.id,
      targetType: 'User',
      status: 'Success',
    });

    return res.json(result);
  } catch (err) {
    const normalizedEmail = (req.body?.email || '').trim();
    await logAction({
      req,
      user: { email: normalizedEmail, name: normalizedEmail, role: 'unauthenticated' },
      module: 'Authentication',
      action: 'Failed Login Attempt',
      description: `Failed login attempt for identifier '${normalizedEmail}'. ${err.message || 'Invalid credentials'}`,
      status: 'Failed',
      details: { attemptedEmail: normalizedEmail, reason: err.message },
    });

    return next(err);
  }
}

async function authLogout(req, res, next) {
  try {
    if (req.user) {
      await logAction({
        req,
        user: req.user,
        module: 'Authentication',
        action: 'User Logout',
        description: `User ${req.user.name || req.user.email} logged out of the session.`,
        targetId: req.user.id || req.user.sub,
        targetType: 'User',
        status: 'Success',
      });
    }
    return res.json({ message: 'Successfully logged out' });
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
    
    await logAction({
      req,
      user: { email, name: email, role: 'user' },
      module: 'Authentication',
      action: 'Requested Password Reset',
      description: `Password reset token requested for account ${email}.`,
      status: 'Success',
    });

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

    await logAction({
      req,
      module: 'Authentication',
      action: 'Password Reset',
      description: 'Account password was successfully reset via reset token.',
      status: 'Success',
    });

    return res.json(result);
  } catch (err) {
    await logAction({
      req,
      module: 'Authentication',
      action: 'Failed Password Reset',
      description: `Password reset attempt failed: ${err.message}`,
      status: 'Failed',
    });
    return next(err);
  }
}

async function authChangePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);

    await logAction({
      req,
      user: req.user,
      module: 'Authentication',
      action: 'Password Change',
      description: `User ${req.user.name || req.user.email} changed their password.`,
      targetId: req.user.id,
      targetType: 'User',
      status: 'Success',
    });

    return res.json(result);
  } catch (err) {
    await logAction({
      req,
      user: req.user,
      module: 'Authentication',
      action: 'Failed Password Change',
      description: `User ${req.user?.name || req.user?.email} failed to change password: ${err.message}`,
      targetId: req.user?.id,
      targetType: 'User',
      status: 'Failed',
    });
    return next(err);
  }
}

async function authUpdateProfile(req, res, next) {
  try {
    const { name, phone } = req.body;
    const result = await authService.updateProfile(req.user.id, { name, phone });

    await logAction({
      req,
      user: req.user,
      module: 'User Management',
      action: 'Updated Profile',
      description: `User ${req.user.name || req.user.email} updated profile details.`,
      targetId: req.user.id,
      targetType: 'User',
      status: 'Success',
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  authRegister,
  authLogin,
  authLogout,
  authForgot,
  authReset,
  authMe,
  authChangePassword,
  authUpdateProfile,
};

