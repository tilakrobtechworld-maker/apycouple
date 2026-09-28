'use strict';

/**
 * Runs automatically before `npm run dev` (see package.json "predev").
 * This project's MySQL is XAMPP's bundled server, which normally has to be
 * started by hand from the XAMPP Control Panel. If it's not running, every
 * DB-backed request (register/login/etc.) fails with a generic 500 error.
 * This makes `npm run dev` self-sufficient: it starts MySQL if needed and
 * waits until it's accepting connections before letting dev continue.
 */

require('dotenv').config();
const net = require('net');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.DB_PORT, 10) || 3306;
const XAMPP_DIR = 'C:\\xampp';
const MYSQLD = path.join(XAMPP_DIR, 'mysql', 'bin', 'mysqld.exe');
const MY_INI = path.join(XAMPP_DIR, 'mysql', 'bin', 'my.ini');

const isPortOpen = (host, port, timeout = 1000) =>
  new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
    socket.once('error', () => resolve(false));
    socket.connect(port, host);
  });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (process.env.DATABASE_URL) {
    console.log('✅ DATABASE_URL set - using hosted Postgres, skipping local MySQL check.');
    return;
  }

  if (await isPortOpen(DB_HOST, DB_PORT)) {
    console.log(`\u2705 MySQL already running on ${DB_HOST}:${DB_PORT}.`);
    return;
  }

  if (!fs.existsSync(MYSQLD)) {
    console.warn(
      `\u26a0\ufe0f  MySQL is not running on ${DB_HOST}:${DB_PORT} and XAMPP was not found at ${XAMPP_DIR}.\n` +
      `   Start your MySQL server manually, then re-run npm run dev.`
    );
    return;
  }

  console.log('\u26a0\ufe0f  MySQL is not running — starting XAMPP MySQL in the background...');

  const child = spawn(MYSQLD, ['--defaults-file=' + MY_INI, '--standalone'], {
    cwd: path.join(XAMPP_DIR, 'mysql', 'bin'),
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();

  const maxWaitMs = 20000;
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await isPortOpen(DB_HOST, DB_PORT)) {
      console.log(`\u2705 MySQL is up on ${DB_HOST}:${DB_PORT}.`);
      return;
    }
    await wait(500);
  }

  console.warn(
    `\u26a0\ufe0f  MySQL did not come up within ${maxWaitMs / 1000}s. ` +
    'Check the XAMPP Control Panel for errors, then re-run npm run dev.'
  );
}

main();
