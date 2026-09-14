'use strict';

const jwt = require('jsonwebtoken');

/**
 * Generate a short-lived access token (default: 15m)
 * @param {object} payload - Token payload (must include id, role)
 * @returns {string} Signed JWT
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
};

/**
 * Generate a long-lived refresh token (default: 7d)
 * @param {object} payload - Token payload
 * @returns {string} Signed JWT
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
};

module.exports = { generateAccessToken, generateRefreshToken };
