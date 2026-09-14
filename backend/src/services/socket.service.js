'use strict';

const { Server } = require('socket.io');
const { toOrigin } = require('../utils/toOrigin');

let io = null;

/**
 * Initialize Socket.io on the HTTP server.
 * @param {http.Server} server - Node.js HTTP server
 * @returns {Server} Socket.io server instance
 */
const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        toOrigin(process.env.FRONTEND_URL, 'http://localhost:3000'),
        toOrigin(process.env.ADMIN_URL, 'http://localhost:3001'),
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ── Join a couple's room for live updates ─────────────────────────────────
    socket.on('join_couple_room', (coupleId) => {
      if (!coupleId) return;
      socket.join(`couple-${coupleId}`);
      console.log(`Socket ${socket.id} joined room: couple-${coupleId}`);
    });

    // ── Leave a room ──────────────────────────────────────────────────────────
    socket.on('leave_couple_room', (coupleId) => {
      if (!coupleId) return;
      socket.leave(`couple-${coupleId}`);
      console.log(`Socket ${socket.id} left room: couple-${coupleId}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  console.log('✅ Socket.io initialized.');
  return io;
};

/**
 * Get the Socket.io instance.
 * Must be called after initSocket().
 * @returns {Server|null} Socket.io instance
 */
const getIO = () => {
  if (!io) {
    console.warn('⚠️  Socket.io not initialized yet.');
    return null;
  }
  return io;
};

/**
 * Emit a new photo event to a couple's room.
 * @param {string} coupleId
 * @param {object} mediaData - Media gallery record data
 */
const emitNewPhoto = (coupleId, mediaData) => {
  if (!io) return;
  io.to(`couple-${coupleId}`).emit('new_photo', mediaData);
};

/**
 * Emit an RSVP submitted event to a couple's room.
 * @param {string} coupleId
 * @param {object} rsvpData - RSVP submission data
 */
const emitRsvpSubmitted = (coupleId, rsvpData) => {
  if (!io) return;
  io.to(`couple-${coupleId}`).emit('rsvp_submitted', rsvpData);
};

/**
 * Emit a new guestbook message event to a couple's room.
 * @param {string} coupleId
 * @param {object} messageData - Guestbook entry data
 */
const emitNewMessage = (coupleId, messageData) => {
  if (!io) return;
  io.to(`couple-${coupleId}`).emit('new_message', messageData);
};

module.exports = { initSocket, getIO, emitNewPhoto, emitRsvpSubmitted, emitNewMessage };
