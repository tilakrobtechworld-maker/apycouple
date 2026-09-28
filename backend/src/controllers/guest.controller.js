'use strict';

const { Op } = require('sequelize');
const csv = require('csv-parser');
const { Readable } = require('stream');
const { Guest, GuestParty, Event, EventGuestAccess, CoupleProfile } = require('../models');
const { success, error, paginated } = require('../utils/apiResponse');
const { likeOp } = require('../utils/dbCompat');
const { generateRsvpToken } = require('../utils/generateRsvpToken');

/**
 * GET /api/guests
 * Get all guests with optional filters + pagination.
 */
const getAll = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const { page = 1, limit = 20, side, category, search, event_id, party_id } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const where = { couple_id: coupleId };
    if (side) where.side = side;
    if (category) where.category = category;
    if (party_id) where.party_id = party_id;
    if (search) {
      where[Op.or] = [
        { first_name: { [likeOp]: `%${search}%` } },
        { last_name: { [likeOp]: `%${search}%` } },
        { email: { [likeOp]: `%${search}%` } },
      ];
    }

    // Filter by event if event_id provided
    let guestIdsForEvent = null;
    if (event_id) {
      const access = await EventGuestAccess.findAll({ where: { event_id }, attributes: ['guest_id'] });
      guestIdsForEvent = access.map((a) => a.guest_id);
      where.id = { [Op.in]: guestIdsForEvent };
    }

    const { count, rows } = await Guest.findAndCountAll({
      where,
      include: [{ model: GuestParty, as: 'party', required: false }],
      limit: parseInt(limit, 10),
      offset,
      order: [['created_at', 'DESC']],
    });

    return paginated(res, rows, count, page, limit, 'Guests retrieved.');
  } catch (err) {
    console.error('getAll guests error:', err);
    error(res, 'Failed to retrieve guests.', 500);
  }
};

/**
 * GET /api/guests/:id
 */
const getById = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const guest = await Guest.findOne({
      where: { id: req.params.id, couple_id: coupleId },
      include: [
        { model: GuestParty, as: 'party', required: false },
        { model: Event, as: 'events', through: { attributes: [] }, required: false },
      ],
    });
    if (!guest) return error(res, 'Guest not found.', 404);
    return success(res, guest, 'Guest retrieved.');
  } catch (err) {
    console.error('getById guest error:', err);
    error(res, 'Failed to retrieve guest.', 500);
  }
};

/**
 * POST /api/guests
 */
const create = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const {
      first_name, last_name, email, phone, side, category,
      dietary_restrictions, plus_one_allowed, plus_one_name,
      party_id, invited_via,
    } = req.body;

    if (!first_name) return error(res, 'first_name is required.', 400);

    // Check for duplicate email within couple
    if (email) {
      const dup = await Guest.findOne({ where: { couple_id: coupleId, email } });
      if (dup) return error(res, `A guest with email ${email} already exists.`, 409);
    }

    const guest = await Guest.create({
      couple_id: coupleId,
      first_name,
      last_name,
      email,
      phone,
      side: side || 'mutual',
      category: category || 'friend',
      dietary_restrictions,
      plus_one_allowed: plus_one_allowed || false,
      plus_one_name,
      party_id: party_id || null,
      invited_via: invited_via || 'manual',
      rsvp_token: generateRsvpToken(),
    });

    return success(res, guest, 'Guest created.', 201);
  } catch (err) {
    console.error('create guest error:', err);
    error(res, 'Failed to create guest.', 500);
  }
};

/**
 * PUT /api/guests/:id
 */
const update = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const guest = await Guest.findOne({ where: { id: req.params.id, couple_id: coupleId } });
    if (!guest) return error(res, 'Guest not found.', 404);

    const {
      first_name, last_name, email, phone, side, category,
      dietary_restrictions, plus_one_allowed, plus_one_name, party_id, invited_via,
    } = req.body;

    // Check email uniqueness if changing
    if (email && email !== guest.email) {
      const dup = await Guest.findOne({ where: { couple_id: coupleId, email } });
      if (dup) return error(res, `A guest with email ${email} already exists.`, 409);
    }

    await guest.update({
      first_name: first_name ?? guest.first_name,
      last_name: last_name ?? guest.last_name,
      email: email ?? guest.email,
      phone: phone ?? guest.phone,
      side: side ?? guest.side,
      category: category ?? guest.category,
      dietary_restrictions: dietary_restrictions ?? guest.dietary_restrictions,
      plus_one_allowed: plus_one_allowed ?? guest.plus_one_allowed,
      plus_one_name: plus_one_name ?? guest.plus_one_name,
      party_id: party_id !== undefined ? party_id : guest.party_id,
      invited_via: invited_via ?? guest.invited_via,
    });

    return success(res, guest, 'Guest updated.');
  } catch (err) {
    console.error('update guest error:', err);
    error(res, 'Failed to update guest.', 500);
  }
};

/**
 * DELETE /api/guests/:id
 */
const deleteGuest = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const guest = await Guest.findOne({ where: { id: req.params.id, couple_id: coupleId } });
    if (!guest) return error(res, 'Guest not found.', 404);
    await guest.destroy();
    return success(res, null, 'Guest deleted.');
  } catch (err) {
    console.error('deleteGuest error:', err);
    error(res, 'Failed to delete guest.', 500);
  }
};

/**
 * DELETE /api/guests/bulk-delete
 * Delete multiple guests by IDs.
 */
const bulkDelete = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return error(res, 'ids array is required.', 400);
    }

    const deleted = await Guest.destroy({
      where: { id: { [Op.in]: ids }, couple_id: coupleId },
    });

    return success(res, { deleted }, `${deleted} guest(s) deleted.`);
  } catch (err) {
    console.error('bulkDelete guests error:', err);
    error(res, 'Failed to bulk delete guests.', 500);
  }
};

/**
 * POST /api/guests/import-csv
 * Parse CSV file and bulk-create guests.
 * Expected columns: first_name, last_name, email, phone, side, category
 */
const importCSV = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    if (!req.file) return error(res, 'CSV file is required.', 400);

    const results = [];
    const stream = Readable.from(req.file.buffer.toString());

    await new Promise((resolve, reject) => {
      stream
        .pipe(csv({ mapHeaders: ({ header }) => header.trim().toLowerCase() }))
        .on('data', (row) => results.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    let created = 0;
    let duplicates = 0;
    const errors = [];

    for (const row of results) {
      try {
        if (!row.first_name) {
          errors.push({ row, reason: 'first_name is missing' });
          continue;
        }

        // Check duplicate email
        if (row.email) {
          const dup = await Guest.findOne({ where: { couple_id: coupleId, email: row.email.trim() } });
          if (dup) {
            duplicates++;
            continue;
          }
        }

        await Guest.create({
          couple_id: coupleId,
          first_name: row.first_name.trim(),
          last_name: row.last_name?.trim() || null,
          email: row.email?.trim() || null,
          phone: row.phone?.trim() || null,
          side: ['bride', 'groom', 'mutual'].includes(row.side) ? row.side : 'mutual',
          category: ['vip', 'family', 'friend', 'colleague', 'other'].includes(row.category)
            ? row.category
            : 'friend',
          rsvp_token: generateRsvpToken(),
        });
        created++;
      } catch (rowErr) {
        errors.push({ row, reason: rowErr.message });
      }
    }

    return success(res, { created, duplicates, errors, total: results.length }, 'CSV imported.');
  } catch (err) {
    console.error('importCSV error:', err);
    error(res, 'Failed to import CSV.', 500);
  }
};

/**
 * GET /api/guests/export-csv
 * Generate and return all guests as CSV download.
 */
const exportCSV = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const guests = await Guest.findAll({
      where: { couple_id: coupleId },
      order: [['last_name', 'ASC'], ['first_name', 'ASC']],
      raw: true,
    });

    const headers = 'first_name,last_name,email,phone,side,category,dietary_restrictions,plus_one_allowed,plus_one_name,rsvp_token\n';
    const rows = guests.map((g) =>
      [
        g.first_name, g.last_name || '', g.email || '', g.phone || '',
        g.side, g.category, g.dietary_restrictions || '',
        g.plus_one_allowed ? 'yes' : 'no', g.plus_one_name || '', g.rsvp_token,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );

    const csv = headers + rows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="guests.csv"');
    return res.send(csv);
  } catch (err) {
    console.error('exportCSV error:', err);
    error(res, 'Failed to export guests.', 500);
  }
};

/**
 * POST /api/guests/:id/assign-events
 * Assign guest to multiple events.
 */
const assignToEvents = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const { event_ids } = req.body;
    if (!event_ids || !Array.isArray(event_ids)) {
      return error(res, 'event_ids array is required.', 400);
    }

    const guest = await Guest.findOne({ where: { id: req.params.id, couple_id: coupleId } });
    if (!guest) return error(res, 'Guest not found.', 404);

    // Bulk upsert event access records
    const records = event_ids.map((event_id) => ({ event_id, guest_id: guest.id }));
    await EventGuestAccess.bulkCreate(records, { ignoreDuplicates: true });

    return success(res, null, 'Guest assigned to events.');
  } catch (err) {
    console.error('assignToEvents error:', err);
    error(res, 'Failed to assign guest to events.', 500);
  }
};

/**
 * DELETE /api/guests/:id/events/:event_id
 * Remove guest from a specific event.
 */
const removeFromEvent = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const guest = await Guest.findOne({ where: { id: req.params.id, couple_id: coupleId } });
    if (!guest) return error(res, 'Guest not found.', 404);

    await EventGuestAccess.destroy({
      where: { guest_id: guest.id, event_id: req.params.event_id },
    });

    return success(res, null, 'Guest removed from event.');
  } catch (err) {
    console.error('removeFromEvent error:', err);
    error(res, 'Failed to remove guest from event.', 500);
  }
};

/**
 * GET /api/guests/:id/events
 * Get events a guest is assigned to.
 */
const getGuestEvents = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const guest = await Guest.findOne({
      where: { id: req.params.id, couple_id: coupleId },
      include: [{ model: Event, as: 'events', through: { attributes: [] } }],
    });
    if (!guest) return error(res, 'Guest not found.', 404);
    return success(res, guest.events, 'Guest events retrieved.');
  } catch (err) {
    console.error('getGuestEvents error:', err);
    error(res, 'Failed to retrieve guest events.', 500);
  }
};

// ─── Party Management ─────────────────────────────────────────────────────────

/**
 * GET /api/guests/parties
 */
const getParties = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const parties = await GuestParty.findAll({
      where: { couple_id: coupleId },
      include: [{ model: Guest, as: 'guests', required: false }],
      order: [['created_at', 'DESC']],
    });
    return success(res, parties, 'Guest parties retrieved.');
  } catch (err) {
    console.error('getParties error:', err);
    error(res, 'Failed to retrieve parties.', 500);
  }
};

/**
 * POST /api/guests/parties
 */
const createParty = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const { party_name, total_members } = req.body;
    if (!party_name) return error(res, 'party_name is required.', 400);

    const party = await GuestParty.create({
      couple_id: coupleId,
      party_name,
      total_members: total_members || 1,
    });
    return success(res, party, 'Party created.', 201);
  } catch (err) {
    console.error('createParty error:', err);
    error(res, 'Failed to create party.', 500);
  }
};

/**
 * PUT /api/guests/parties/:id
 */
const updateParty = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const party = await GuestParty.findOne({ where: { id: req.params.id, couple_id: coupleId } });
    if (!party) return error(res, 'Party not found.', 404);

    const { party_name, total_members } = req.body;
    await party.update({
      party_name: party_name ?? party.party_name,
      total_members: total_members ?? party.total_members,
    });
    return success(res, party, 'Party updated.');
  } catch (err) {
    console.error('updateParty error:', err);
    error(res, 'Failed to update party.', 500);
  }
};

/**
 * DELETE /api/guests/parties/:id
 */
const deleteParty = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const party = await GuestParty.findOne({ where: { id: req.params.id, couple_id: coupleId } });
    if (!party) return error(res, 'Party not found.', 404);

    // Unlink guests from this party
    await Guest.update({ party_id: null }, { where: { party_id: party.id } });
    await party.destroy();
    return success(res, null, 'Party deleted.');
  } catch (err) {
    console.error('deleteParty error:', err);
    error(res, 'Failed to delete party.', 500);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  deleteGuest,
  bulkDelete,
  importCSV,
  exportCSV,
  assignToEvents,
  removeFromEvent,
  getGuestEvents,
  getParties,
  createParty,
  updateParty,
  deleteParty,
};
