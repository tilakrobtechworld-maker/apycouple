'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { User, CoupleProfile } = require('../models');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const { generateSlug } = require('../utils/generateSlug');
const { success, error } = require('../utils/apiResponse');
const redisClient = require('../config/redis');

// ─── Validation Rules ──────────────────────────────────────────────────────────
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('bride_name').optional().isString().trim(),
  body('groom_name').optional().isString().trim(),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// ─── Helper: Build Token Payload ──────────────────────────────────────────────
const buildTokenPayload = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role,
});

// ─── Controller Methods ───────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Register a new couple account.
 */
const register = async (req, res) => {
  try {
    const { email, password, bride_name, groom_name } = req.body;

    // Check if email already exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return error(res, 'An account with this email already exists.', 409);
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      email,
      password_hash,
      role: 'couple',
      subscription_tier: 'free',
    });

    // Generate unique slug from names
    const slug = await generateSlug(bride_name || '', groom_name || '');
    const displayName =
      bride_name && groom_name
        ? `${bride_name} & ${groom_name}`
        : bride_name || groom_name || 'Our Wedding';

    // Create couple profile
    const coupleProfile = await CoupleProfile.create({
      user_id: user.id,
      bride_name: bride_name || null,
      groom_name: groom_name || null,
      couple_display_name: displayName,
      custom_slug: slug,
    });

    // Generate tokens
    const payload = buildTokenPayload(user);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return success(
      res,
      {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          subscription_tier: user.subscription_tier,
          coupleProfile: {
            id: coupleProfile.id,
            bride_name: coupleProfile.bride_name,
            groom_name: coupleProfile.groom_name,
            couple_display_name: coupleProfile.couple_display_name,
            custom_slug: coupleProfile.custom_slug,
          },
        },
      },
      'Registration successful.',
      201
    );
  } catch (err) {
    console.error('register error:', err);
    error(res, 'Registration failed. Please try again.', 500);
  }
};

/**
 * POST /api/auth/login
 * Authenticate user and return JWT tokens.
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email },
      include: [{ model: CoupleProfile, as: 'coupleProfile' }],
    });

    if (!user) {
      return error(res, 'Invalid email or password.', 401);
    }

    if (!user.is_active) {
      return error(res, 'Account is suspended. Please contact support.', 403);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return error(res, 'Invalid email or password.', 401);
    }

    // Update last login
    await user.update({ last_login: new Date() });

    const payload = buildTokenPayload(user);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return success(res, {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        subscription_tier: user.subscription_tier,
        last_login: user.last_login,
        coupleProfile: user.coupleProfile,
      },
    }, 'Login successful.');
  } catch (err) {
    console.error('login error:', err);
    error(res, 'Login failed. Please try again.', 500);
  }
};

/**
 * POST /api/auth/admin-login
 * Login but only for admin/superadmin roles.
 */
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });

    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      return error(res, 'Access denied. Admin credentials required.', 403);
    }

    if (!user.is_active) {
      return error(res, 'Account is suspended.', 403);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return error(res, 'Invalid email or password.', 401);
    }

    await user.update({ last_login: new Date() });

    const payload = buildTokenPayload(user);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return success(res, {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    }, 'Admin login successful.');
  } catch (err) {
    console.error('adminLogin error:', err);
    error(res, 'Login failed.', 500);
  }
};

/**
 * POST /api/auth/refresh
 * Issue a new access token from a valid refresh token.
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return error(res, 'Refresh token is required.', 400);

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (jwtErr) {
      return error(res, 'Invalid or expired refresh token.', 401);
    }

    // Optional: check if token is blacklisted in Redis
    if (redisClient) {
      const blacklisted = await redisClient.get(`blacklist:${token}`).catch(() => null);
      if (blacklisted) return error(res, 'Token has been revoked.', 401);
    }

    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) {
      return error(res, 'User not found or suspended.', 401);
    }

    const newAccessToken = generateAccessToken(buildTokenPayload(user));

    return success(res, { accessToken: newAccessToken }, 'Token refreshed.');
  } catch (err) {
    console.error('refreshToken error:', err);
    error(res, 'Token refresh failed.', 500);
  }
};

/**
 * POST /api/auth/logout
 * Optionally blacklist refresh token in Redis.
 */
const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (token && redisClient) {
      // Blacklist for 7 days (TTL matches refresh expiry)
      await redisClient
        .set(`blacklist:${token}`, '1', 'EX', 7 * 24 * 60 * 60)
        .catch(() => null);
    }

    return success(res, null, 'Logged out successfully.');
  } catch (err) {
    console.error('logout error:', err);
    error(res, 'Logout failed.', 500);
  }
};

/**
 * GET /api/auth/me
 * Return current authenticated user with couple profile.
 */
const getMe = async (req, res) => {
  try {
    return success(res, req.user, 'User retrieved.');
  } catch (err) {
    console.error('getMe error:', err);
    error(res, 'Failed to retrieve user.', 500);
  }
};

/**
 * PUT /api/auth/change-password
 * Change password with old password verification.
 */
const changePassword = async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password) {
      return error(res, 'old_password and new_password are required.', 400);
    }
    if (new_password.length < 6) {
      return error(res, 'New password must be at least 6 characters.', 400);
    }

    const user = await User.findByPk(req.user.id);
    const isMatch = await bcrypt.compare(old_password, user.password_hash);
    if (!isMatch) {
      return error(res, 'Old password is incorrect.', 400);
    }

    const password_hash = await bcrypt.hash(new_password, 12);
    await user.update({ password_hash });

    return success(res, null, 'Password changed successfully.');
  } catch (err) {
    console.error('changePassword error:', err);
    error(res, 'Password change failed.', 500);
  }
};

module.exports = {
  register,
  login,
  adminLogin,
  refreshToken,
  logout,
  getMe,
  changePassword,
  registerValidation,
  loginValidation,
};
