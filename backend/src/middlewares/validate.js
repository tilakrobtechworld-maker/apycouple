'use strict';

const { validationResult } = require('express-validator');
const { error } = require('../utils/apiResponse');

/**
 * Middleware: Run express-validator checks and return 422 if errors found.
 * Usage: place after your validator chains in the route.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: 'error',
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({
        field: e.path || e.param,
        message: e.msg,
      })),
    });
  }
  next();
};

module.exports = validate;
