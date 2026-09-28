'use strict';

require('dotenv').config();
const { Sequelize } = require('sequelize');

const logging = process.env.NODE_ENV === 'development' ? console.log : false;
const pool = { max: 10, min: 0, acquire: 30000, idle: 10000 };

// DATABASE_URL (e.g. Neon / any hosted Postgres) takes priority. Without it
// we fall back to the local MySQL (XAMPP) setup used in development.
let sequelize;

if (process.env.DATABASE_URL) {
  // Drop the query string (sslmode / channel_binding) and set SSL explicitly,
  // so the pg driver doesn't have to interpret Neon's URL params.
  const url = new URL(process.env.DATABASE_URL);
  url.search = '';

  sequelize = new Sequelize(url.toString(), {
    dialect: 'postgres',
    logging,
    pool,
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
    },
    timezone: '+00:00',
  });
} else {
  if (process.env.NODE_ENV === 'production' && !process.env.DB_HOST) {
    throw new Error('No database configured: set DATABASE_URL (Postgres) in the environment variables.');
  }
  sequelize = new Sequelize(
    process.env.DB_NAME || 'savethedate_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      dialect: 'mysql',
      logging,
      pool,
      define: {
        underscored: false,
        freezeTableName: false,
        charset: 'utf8mb4',
        dialectOptions: {
          collate: 'utf8mb4_unicode_ci',
        },
      },
      ...(process.env.DB_SSL === 'true' && {
        dialectOptions: {
          ssl: { rejectUnauthorized: false },
        },
      }),
      timezone: '+00:00',
    }
  );
}

module.exports = sequelize;
