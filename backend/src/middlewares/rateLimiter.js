'use strict';

const rateLimit = require('express-rate-limit');

// Brute-force protection for credential-guessing endpoints (register/login).
// Disabled outside production so local dev/testing never gets throttled.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== 'production',
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

module.exports = { authLimiter };
