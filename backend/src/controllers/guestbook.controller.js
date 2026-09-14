'use strict';

const { GuestbookEntry, Guest, CoupleProfile } = require('../models');
const { success, error } = require('../utils/apiResponse');
const { emitNewMessage } = require('../services/socket.service');

/**
 * GET /api/guestbook/approved
 * Public: Get approved guestbook entries by couple slug or ID.
 */
const getApproved = async (req, res) => {
  try {
    const { slug, couple_id } = req.query;
    let coupleId = couple_id;

    if (!coupleId && slug) {
      const profile = await CoupleProfile.findOne({ where: { custom_slug: slug } });
      if (!profile) return error(res, 'Couple not found.', 404);
      coupleId = profile.id;
    }
    if (!coupleId) return error(res, 'couple_id or slug is required.', 400);

    const entries = await GuestbookEntry.findAll({
      where: { couple_id: coupleId, is_approved: true },
      order: [['created_at', 'DESC']],
    });
    return success(res, entries, 'Guestbook entries retrieved.');
  } catch (err) {
    console.error('getApproved guestbook error:', err);
    error(res, 'Failed to retrieve guestbook.', 500);
  }
};

/**
 * GET /api/guestbook/pending
 * Protected: Moderation queue.
 */
const getPending = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const entries = await GuestbookEntry.findAll({
      where: { couple_id: coupleId, is_approved: false },
      include: [{ model: Guest, as: 'guest', required: false }],
      order: [['created_at', 'DESC']],
    });
    return success(res, entries, 'Pending guestbook entries retrieved.');
  } catch (err) {
    console.error('getPending guestbook error:', err);
    error(res, 'Failed to retrieve pending entries.', 500);
  }
};

/**
 * POST /api/guestbook
 * Public: Create a guestbook entry (guest or anonymous).
 */
const create = async (req, res) => {
  try {
    const { couple_id, guest_rsvp_token, author_name, message_text, entry_type, media_url } = req.body;

    if (!couple_id || !author_name) {
      return error(res, 'couple_id and author_name are required.', 400);
    }

    let guestId = null;
    if (guest_rsvp_token) {
      const guest = await Guest.findOne({ where: { rsvp_token: guest_rsvp_token, couple_id } });
      if (guest) guestId = guest.id;
    }

    const entry = await GuestbookEntry.create({
      couple_id,
      guest_id: guestId,
      author_name,
      message_text: message_text || null,
      media_url: media_url || null,
      entry_type: entry_type || 'text',
      is_approved: false, // Requires moderation
    });

    // Emit socket event
    emitNewMessage(couple_id, entry.toJSON());

    return success(res, entry, 'Guestbook entry submitted. Awaiting approval.', 201);
  } catch (err) {
    console.error('create guestbook error:', err);
    error(res, 'Failed to submit guestbook entry.', 500);
  }
};

/**
 * PATCH /api/guestbook/:id/approve
 * Protected: Approve a guestbook entry.
 */
const approve = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const entry = await GuestbookEntry.findOne({ where: { id: req.params.id, couple_id: coupleId } });
    if (!entry) return error(res, 'Entry not found.', 404);
    await entry.update({ is_approved: true });
    return success(res, entry, 'Entry approved.');
  } catch (err) {
    console.error('approve guestbook error:', err);
    error(res, 'Failed to approve entry.', 500);
  }
};

/**
 * DELETE /api/guestbook/:id
 * Protected: Delete a guestbook entry.
 */
const deleteEntry = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const entry = await GuestbookEntry.findOne({ where: { id: req.params.id, couple_id: coupleId } });
    if (!entry) return error(res, 'Entry not found.', 404);
    await entry.destroy();
    return success(res, null, 'Entry deleted.');
  } catch (err) {
    console.error('deleteEntry guestbook error:', err);
    error(res, 'Failed to delete entry.', 500);
  }
};

module.exports = {
  getApproved,
  getAll: getApproved,      // alias used by couple dashboard
  getPending,
  create,
  approve,
  deleteEntry,
  remove: deleteEntry,      // alias
};

