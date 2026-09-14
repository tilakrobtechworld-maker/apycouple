'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique UUID v4 RSVP token for a guest.
 * This token is used in magic-link RSVP URLs.
 * @returns {string} UUID v4 token
 */
const generateRsvpToken = () => {
  return uuidv4();
};

module.exports = { generateRsvpToken };
