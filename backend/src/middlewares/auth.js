'use strict';

const jwt = require('jsonwebtoken');
const { User, CoupleProfile } = require('../models');
const { error } = require('../utils/apiResponse');

/**
 * Middleware: Verify JWT Bearer token.
 * Attaches req.user (User + CoupleProfile) if valid.
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'No token provided. Authorization denied.', 401);
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return error(res, 'Token has expired. Please log in again.', 401);
      }
      return error(res, 'Invalid token. Authorization denied.', 401);
    }

    // Fetch user with couple profile
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        {
          model: CoupleProfile,
          as: 'coupleProfile',
          required: false,
        },
      ],
    });

    if (!user) {
      return error(res, 'User not found. Authorization denied.', 401);
    }

    if (!user.is_active) {
      return error(res, 'Account is suspended. Please contact support.', 403);
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    error(res, 'Authentication failed.', 500);
  }
};

// Support both import styles used across the API.  Most route modules import
// this middleware as `{ protect }`, while a few consumers use the default.
module.exports = auth;
module.exports.protect = auth;
