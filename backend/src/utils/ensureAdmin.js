'use strict';

const bcrypt = require('bcryptjs');

/**
 * Creates (or promotes) the admin-panel account from environment variables, so a
 * freshly deployed database is usable without running a manual seed script:
 *
 *   ADMIN_EMAIL     - login email for the admin panel
 *   ADMIN_PASSWORD  - its password (min 8 chars)
 *   ADMIN_RESET_PASSWORD=true - (optional) overwrite the password of an existing
 *                     admin with ADMIN_PASSWORD on this boot, e.g. if it was forgotten
 *
 * Does nothing when ADMIN_EMAIL / ADMIN_PASSWORD aren't set. An existing admin's
 * password is never touched unless ADMIN_RESET_PASSWORD is "true".
 */
const ensureAdmin = async () => {
  // The login route runs emails through express-validator's normalizeEmail()
  // (e.g. strips dots from Gmail addresses), so store the same normalized form
  // or the lookup at login time would never match.
  const rawEmail = (process.env.ADMIN_EMAIL || '').trim();
  const email = (rawEmail && require('validator').normalizeEmail(rawEmail)) || '';
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || !password) return;
  if (password.length < 8) {
    console.warn('⚠️  ADMIN_PASSWORD must be at least 8 characters - admin account not created.');
    return;
  }

  const { User } = require('../models');
  const existing = await User.findOne({ where: { email } });

  if (!existing) {
    await User.create({
      email,
      password_hash: await bcrypt.hash(password, 12),
      role: 'superadmin',
      subscription_tier: 'elite',
      is_active: true,
    });
    console.log(`✅ Admin account created: ${email}`);
    return;
  }

  const updates = {};
  if (!['admin', 'superadmin'].includes(existing.role)) updates.role = 'superadmin';
  if (!existing.is_active) updates.is_active = true;
  if (process.env.ADMIN_RESET_PASSWORD === 'true') updates.password_hash = await bcrypt.hash(password, 12);

  if (Object.keys(updates).length) {
    await existing.update(updates);
    console.log(`✅ Admin account updated: ${email} (${Object.keys(updates).join(', ')})`);
  }
};

module.exports = { ensureAdmin };
