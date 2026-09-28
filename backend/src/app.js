'use strict';

require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { sequelize } = require('./models');
const routes = require('./routes');
const { initSocket } = require('./services/socket.service');
const { success, error } = require('./utils/apiResponse');
const { shouldAlterSync } = require('./utils/shouldAlterSync');
const { toOrigin } = require('./utils/toOrigin');
const { ensureThemeLayoutColumn, seedTemplates, seedCardTemplates } = require('./utils/seedTemplates');

// ─── Handle uncaught exceptions early ────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...', err.name, err.message);
  process.exit(1);
});

const app = express();
// Render (like Heroku) sits behind a reverse proxy - trust its X-Forwarded-For
// header so express-rate-limit and req.ip see the real client IP.
app.set('trust proxy', 1);
const server = http.createServer(app);

// ─── Initialize Socket.io ─────────────────────────────────────────────────────
initSocket(server);

// ─── Security Middlewares ─────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: [
      toOrigin(process.env.FRONTEND_URL, 'http://localhost:3000'),
      toOrigin(process.env.ADMIN_URL, 'http://localhost:3001'),
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Static file serving (local-disk upload fallback when Cloudinary isn't
// configured) — overrides helmet's default same-origin CORP so the
// frontend/admin apps (different ports) can actually load these images.
app.use(
  '/uploads',
  express.static(path.join(__dirname, '..', 'uploads'), {
    setHeaders: (res) => res.set('Cross-Origin-Resource-Policy', 'cross-origin'),
  })
);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
// Credential-guessing endpoints (register/login) get their own stricter
// limiter applied directly in auth.routes.js, so it doesn't also throttle
// session routes like /me, /refresh, /logout that fire on every page load.
// Disabled outside production so local dev/testing never gets throttled.
const isDev = process.env.NODE_ENV !== 'production';
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,
});
app.use('/api', generalLimiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  success(res, { status: 'healthy', timestamp: new Date().toISOString() }, 'Server is running');
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', routes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  error(res, `Route ${req.originalUrl} not found`, 404);
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err);

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const messages = err.errors.map((e) => e.message);
    return error(res, messages.join(', '), 422);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return error(res, 'Invalid token', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return error(res, 'Token expired', 401);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  error(res, message, statusCode);
});

// ─── Database Sync + Server Start ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    const alter = process.env.NODE_ENV === 'development' && shouldAlterSync();
    await sequelize.sync({ alter });
    console.log(alter ? '✅ All models synced (schema altered).' : '✅ All models synced (no schema changes, skipped alter).');

    // Website templates: make sure the layout column exists and the built-in
    // templates are present. Non-fatal - the site still works without them.
    try {
      await ensureThemeLayoutColumn();
      await seedTemplates();
      await seedCardTemplates();
    } catch (seedErr) {
      console.warn('⚠️  Template setup skipped:', seedErr.message);
    }

    server.listen(PORT, () => {
      console.log(`🚀 SaveTheDate server running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (err) {
    console.error('❌ Unable to connect to the database:', err);
    process.exit(1);
  }
};

startServer();

// ─── Handle unhandled promise rejections ─────────────────────────────────────
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...', err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = { app, server };
