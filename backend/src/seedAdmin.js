'use strict';

/**
 * Run this once to create the default admin account:
 * node src/seedAdmin.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User } = require('./models');

const ADMIN_EMAIL = 'admin@appycouple.com';
const ADMIN_PASSWORD = 'Admin@123';

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected.');

    await sequelize.sync({ alter: false });

    // Check if admin already exists
    const existing = await User.findOne({ where: { email: ADMIN_EMAIL } });
    if (existing) {
      console.log(`⚠️  Admin already exists: ${ADMIN_EMAIL}`);
      console.log(`   Role: ${existing.role}`);
      console.log('   If you forgot password, delete the user from DB and re-run this script.');
      process.exit(0);
    }

    const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    await User.create({
      email: ADMIN_EMAIL,
      password_hash,
      role: 'superadmin',
      subscription_tier: 'elite',
      is_active: true,
    });

    console.log('');
    console.log('✅ Admin account created successfully!');
    console.log('──────────────────────────────────────');
    console.log(`   Email   : ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('──────────────────────────────────────');
    console.log('   Login at: http://localhost:3001');
    console.log('');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeder failed:', err.message);
    process.exit(1);
  }
}

seed();

