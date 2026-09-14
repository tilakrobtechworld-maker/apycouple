'use strict';

const { Event, Guest, EventGuestAccess, CoupleProfile } = require('../models');
const { success, error } = require('../utils/apiResponse');

/**
 * GET /api/events
 */
const getAll = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const events = await Event.findAll({
      where: { couple_id: coupleId },
      order: [['start_time', 'ASC']],
    });
    return success(res, events, 'Events retrieved.');
  } catch (err) {
    console.error('getAll events error:', err);
    error(res, 'Failed to retrieve events.', 500);
  }
};

/**
 * GET /api/events/:id
 */
const getById = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const event = await Event.findOne({
      where: { id: req.params.id, couple_id: coupleId },
    });
    if (!event) return error(res, 'Event not found.', 404);
    return success(res, event, 'Event retrieved.');
  } catch (err) {
    console.error('getById event error:', err);
    error(res, 'Failed to retrieve event.', 500);
  }
};

/**
 * POST /api/events
 */
const create = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const {
      title, event_type, venue_name, address, gps_lat, gps_lng,
      start_time, end_time, dress_code, notes, is_public, maps_embed_url,
    } = req.body;

    if (!title) return error(res, 'title is required.', 400);

    const event = await Event.create({
      couple_id: coupleId,
      title,
      event_type: event_type || 'ceremony',
      venue_name,
      address,
      gps_lat,
      gps_lng,
      start_time,
      end_time,
      dress_code,
      notes,
      is_public: is_public !== undefined ? is_public : true,
      maps_embed_url,
    });

    return success(res, event, 'Event created.', 201);
  } catch (err) {
    console.error('create event error:', err);
    error(res, 'Failed to create event.', 500);
  }
};

/**
 * PUT /api/events/:id
 */
const update = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const event = await Event.findOne({ where: { id: req.params.id, couple_id: coupleId } });
    if (!event) return error(res, 'Event not found.', 404);

    const {
      title, event_type, venue_name, address, gps_lat, gps_lng,
      start_time, end_time, dress_code, notes, is_public, maps_embed_url,
    } = req.body;

    await event.update({
      title: title ?? event.title,
      event_type: event_type ?? event.event_type,
      venue_name: venue_name ?? event.venue_name,
      address: address ?? event.address,
      gps_lat: gps_lat ?? event.gps_lat,
      gps_lng: gps_lng ?? event.gps_lng,
      start_time: start_time ?? event.start_time,
      end_time: end_time ?? event.end_time,
      dress_code: dress_code ?? event.dress_code,
      notes: notes ?? event.notes,
      is_public: is_public !== undefined ? is_public : event.is_public,
      maps_embed_url: maps_embed_url ?? event.maps_embed_url,
    });

    return success(res, event, 'Event updated.');
  } catch (err) {
    console.error('update event error:', err);
    error(res, 'Failed to update event.', 500);
  }
};

/**
 * DELETE /api/events/:id
 */
const deleteEvent = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const event = await Event.findOne({ where: { id: req.params.id, couple_id: coupleId } });
    if (!event) return error(res, 'Event not found.', 404);
    await event.destroy();
    return success(res, null, 'Event deleted.');
  } catch (err) {
    console.error('deleteEvent error:', err);
    error(res, 'Failed to delete event.', 500);
  }
};

/**
 * GET /api/events/:id/guests
 * List guests assigned to an event.
 */
const getEventGuests = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const event = await Event.findOne({ where: { id: req.params.id, couple_id: coupleId } });
    if (!event) return error(res, 'Event not found.', 404);

    const guests = await Guest.findAll({
      include: [
        {
          model: Event,
          as: 'events',
          where: { id: event.id },
          through: { attributes: [] },
          required: true,
        },
      ],
    });

    return success(res, guests, 'Event guests retrieved.');
  } catch (err) {
    console.error('getEventGuests error:', err);
    error(res, 'Failed to retrieve event guests.', 500);
  }
};

/**
 * POST /api/events/:id/assign-guests
 * Bulk-assign array of guest IDs to this event.
 */
const bulkAssignGuests = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const guest_ids = req.body.guest_ids || req.body.guestIds;

    if (!guest_ids || !Array.isArray(guest_ids)) {
      return error(res, 'guest_ids array is required.', 400);
    }

    const event = await Event.findOne({ where: { id: req.params.id, couple_id: coupleId } });
    if (!event) return error(res, 'Event not found.', 404);

    const records = guest_ids.map((guest_id) => ({ event_id: event.id, guest_id }));
    await EventGuestAccess.bulkCreate(records, { ignoreDuplicates: true });

    return success(res, { assigned: records.length }, 'Guests assigned to event.');
  } catch (err) {
    console.error('bulkAssignGuests error:', err);
    error(res, 'Failed to assign guests.', 500);
  }
};

/**
 * DELETE /api/events/:id/guests/:guestId
 */
const removeGuestFromEvent = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const event = await Event.findOne({ where: { id: req.params.id, couple_id: coupleId } });
    if (!event) return error(res, 'Event not found.', 404);

    const deleted = await EventGuestAccess.destroy({
      where: { event_id: event.id, guest_id: req.params.guestId },
    });
    if (!deleted) return error(res, 'Guest is not assigned to this event.', 404);

    return success(res, null, 'Guest removed from event.');
  } catch (err) {
    console.error('removeGuestFromEvent error:', err);
    error(res, 'Failed to remove guest from event.', 500);
  }
};

module.exports = { getAll, getById, create, update, deleteEvent, getEventGuests, bulkAssignGuests, removeGuestFromEvent };
