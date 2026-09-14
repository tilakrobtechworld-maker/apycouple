'use strict';

/**
 * multer-storage-cloudinary sets `file.path` to the full Cloudinary URL, but
 * plain multer.diskStorage (the local-disk fallback used when Cloudinary
 * isn't configured) sets `file.path` to an absolute filesystem path —
 * saving that directly as a DB url would never load in a browser. Route
 * local files through the /uploads static route (see app.js) instead.
 */
const getFileUrl = (req, file) => {
  if (!file) return null;
  if (file.path && /^https?:\/\//i.test(file.path)) return file.path;
  if (file.secure_url) return file.secure_url;
  return `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
};

module.exports = { getFileUrl };
