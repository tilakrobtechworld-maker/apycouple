'use strict';

/**
 * Standard API Response Helpers
 */

/**
 * Send a success response.
 * @param {object} res - Express response object
 * @param {*} data - Response payload
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default 200)
 */
const success = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data,
  });
};

/**
 * Send an error response.
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default 400)
 */
const error = (res, message = 'An error occurred', statusCode = 400) => {
  return res.status(statusCode).json({
    status: 'error',
    message,
    data: null,
  });
};

/**
 * Send a paginated success response.
 * @param {object} res - Express response object
 * @param {Array} data - Array of items
 * @param {number} total - Total item count
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {string} message - Success message
 */
const paginated = (res, data, total, page, limit, message = 'Success') => {
  const totalPages = Math.ceil(total / limit);
  return res.status(200).json({
    status: 'success',
    message,
    data,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
};

module.exports = { success, error, paginated };
