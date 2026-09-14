'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MARKER_FILE = path.join(__dirname, '..', '..', '.model-sync-hash');
const MODELS_DIR = path.join(__dirname, '..', 'models');

/**
 * `sequelize.sync({ alter: true })` re-issues a CHANGE COLUMN ... UNIQUE for
 * every unique column on every single run. MySQL doesn't recognize that as
 * a no-op when the index already exists — it adds another one. Nodemon
 * restarts on every file save, so over a long dev session this silently
 * piles up duplicate indexes until a table hits MySQL's 64-key limit and
 * the whole server refuses to start (this happened — see cleanup done
 * 2026-09-14). Only alter when the model files actually changed since the
 * last successful sync, so routine restarts (editing a controller, etc.)
 * don't touch the schema at all.
 */
const shouldAlterSync = () => {
  const files = fs.readdirSync(MODELS_DIR).filter((f) => f.endsWith('.js')).sort();
  const hash = crypto.createHash('sha256');
  for (const file of files) {
    hash.update(file);
    hash.update(fs.readFileSync(path.join(MODELS_DIR, file)));
  }
  const currentHash = hash.digest('hex');

  const previousHash = fs.existsSync(MARKER_FILE) ? fs.readFileSync(MARKER_FILE, 'utf8').trim() : null;

  if (currentHash === previousHash) return false;

  fs.writeFileSync(MARKER_FILE, currentHash);
  return true;
};

module.exports = { shouldAlterSync };
