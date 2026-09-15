'use strict';

// FRONTEND_URL/ADMIN_URL may be a bare host (Render's cross-service env vars
// only provide the hostname, e.g. "savethedate-frontend.onrender.com") -
// normalize to a full origin.
function toOrigin(value, fallback) {
  if (!value) return fallback;
  return /^https?:\/\//.test(value) ? value : `https://${value}`;
}

module.exports = { toOrigin };
