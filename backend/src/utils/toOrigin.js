'use strict';

// FRONTEND_URL/ADMIN_URL may be a bare host (Render's cross-service env vars
// only provide the hostname, e.g. "savethedate-frontend.onrender.com") -
// normalize to a full origin.
function toOrigin(value, fallback) {
  if (!value) return fallback;
  if (/^https?:\/\//.test(value)) return value;
  // Render can give just the service slug ("savethedate-frontend-w37p") with no domain.
  const host = value.includes('.') || value.includes(':') ? value : `${value}.onrender.com`;
  return `https://${host}`;
}

module.exports = { toOrigin };
