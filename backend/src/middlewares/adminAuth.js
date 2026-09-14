'use strict';

const auth = require('./auth');
const { error } = require('../utils/apiResponse');

/**
 * Middleware: Admin authentication.
 * Extends auth.js - checks that the authenticated user has role admin or superadmin.
 */
const adminAuth = async (req, res, next) => {
  // First run standard JWT auth
  await new Promise((resolve) => auth(req, res, resolve));

  // If auth set a response already (error), stop here
  if (res.headersSent) return;

  const { role } = req.user;
  if (role !== 'admin' && role !== 'superadmin') {
    return error(res, 'Access denied. Admin privileges required.', 403);
  }

  next();
};

module.exports = { requireAdmin: adminAuth };
