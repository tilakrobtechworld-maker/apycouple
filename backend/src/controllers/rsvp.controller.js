'use strict';

const { Op } = require('sequelize');
const {
  Guest, Event, RsvpSubmission, RsvpQuestion, CoupleProfile, EventGuestAccess, TravelInfo,
} = require('../models');
const { success, error, paginated } = require('../utils/apiResponse');
const { emitRsvpSubmitted } = require('../services/socket.service');
const { sendInvitation } = require('../services/email.service');
const { toOrigin } = require('../utils/toOrigin');

// Extra arrival/departure logistics a guest can share on the RSVP form.
const TRAVEL_TEXT_FIELDS = [
  'arrival_ticket_details', 'departure_ticket_details',
  'arrival_location', 'departure_location',
  'departure_travel_number',
  'arrival_terminal', 'departure_terminal',
];

const pickTravelFields = (guest) => ({
  departure_datetime: guest.departure_datetime,
  luggage_count: guest.luggage_count,
  ...Object.fromEntries(TRAVEL_TEXT_FIELDS.map((f) => [f, guest[f]])),
});

/**
 * GET /api/rsvp/:token
 * Public: Returns guest info + assigned events + RSVP questions by token.
 * No auth required.
 */
const getPublicRsvpForm = async (req, res) => {
  try {
    const { token } = req.params;

    const guest = await Guest.findOne({
      where: { rsvp_token: token },
      include: [
        {
          model: Event,
          as: 'events',
          through: { attributes: [] },
          required: false,
        },
      ],
    });

    if (!guest) return error(res, 'Invalid RSVP link.', 404);

    // Get couple profile (with theme info for branding)
    const couple = await CoupleProfile.findByPk(guest.couple_id);

    // Get custom RSVP questions for this couple
    const questions = await RsvpQuestion.findAll({
      where: {
        couple_id: guest.couple_id,
        [Op.or]: [{ event_id: null }, { event_id: { [Op.in]: guest.events.map((e) => e.id) } }],
      },
      order: [['sort_order', 'ASC']],
    });

    // Check existing submissions
    const submissions = await RsvpSubmission.findAll({
      where: { guest_id: guest.id },
      attributes: ['event_id', 'attending'],
    });
    const submittedEventIds = submissions.map((s) => s.event_id);

    // Travel/hotel info the couple has set up, so guests can plan their trip
    const travelInfo = await TravelInfo.findAll({
      where: { couple_id: guest.couple_id },
      order: [['sort_order', 'ASC']],
    });

    return success(res, {
      guest: {
        id: guest.id,
        first_name: guest.first_name,
        last_name: guest.last_name,
        plus_one_allowed: guest.plus_one_allowed,
        plus_one_name: guest.plus_one_name,
        arrival_datetime: guest.arrival_datetime,
        travel_mode: guest.travel_mode,
        travel_details: guest.travel_details,
        ...pickTravelFields(guest),
        party_size: guest.party_size,
        party_member_names: guest.party_member_names || [],
      },
      couple: {
        bride_name: couple?.bride_name,
        groom_name: couple?.groom_name,
        couple_display_name: couple?.couple_display_name,
        wedding_date: couple?.wedding_date,
        wedding_hashtag: couple?.wedding_hashtag,
        theme_config: couple?.theme_config,
      },
      events: guest.events,
      questions,
      already_submitted_for: submittedEventIds,
      travel_info: travelInfo,
    }, 'RSVP form data retrieved.');
  } catch (err) {
    console.error('getPublicRsvpForm error:', err);
    error(res, 'Failed to retrieve RSVP form.', 500);
  }
};

/**
 * POST /api/rsvp/:token/submit
 * Public: Submit RSVP for one or more events.
 */
const submitRsvp = async (req, res) => {
  try {
    const { token } = req.params;
    // responses: [{ event_id, attending, meal_choice, dietary_note, song_request, custom_answers }]
    // The rest are guest-level (apply once, not per event) since a guest
    // travels once and attends multiple functions on the same trip.
    const { responses, arrival_datetime, travel_mode, travel_details, party_size, party_member_names, plus_one_name, luggage_count } = req.body;

    if (!responses || !Array.isArray(responses) || responses.length === 0) {
      return error(res, 'responses array is required.', 400);
    }

    const guest = await Guest.findOne({ where: { rsvp_token: token } });
    if (!guest) return error(res, 'Invalid RSVP link.', 404);

    const guestUpdates = {};
    if (arrival_datetime !== undefined) guestUpdates.arrival_datetime = arrival_datetime || null;
    if (travel_mode !== undefined) guestUpdates.travel_mode = travel_mode || null;
    if (travel_details !== undefined) guestUpdates.travel_details = travel_details || null;
    if (plus_one_name !== undefined) guestUpdates.plus_one_name = plus_one_name || null;
    if (req.body.departure_datetime !== undefined) guestUpdates.departure_datetime = req.body.departure_datetime || null;
    TRAVEL_TEXT_FIELDS.forEach((f) => {
      if (req.body[f] !== undefined) guestUpdates[f] = String(req.body[f]).trim() || null;
    });
    if (luggage_count !== undefined) {
      const n = parseInt(luggage_count, 10);
      guestUpdates.luggage_count = Number.isNaN(n) ? null : Math.max(0, n);
    }
    if (party_size !== undefined && party_size !== '') {
      guestUpdates.party_size = Math.max(1, parseInt(party_size, 10) || 1);
    }
    if (Array.isArray(party_member_names)) {
      guestUpdates.party_member_names = party_member_names.filter((n) => n && n.trim());
    }
    if (Object.keys(guestUpdates).length) await guest.update(guestUpdates);

    const created = [];
    for (const resp of responses) {
      const { event_id, attending, meal_choice, dietary_note, song_request, custom_answers } = resp;
      if (!event_id || !attending) continue;

      // Upsert: delete old and create new
      await RsvpSubmission.destroy({ where: { guest_id: guest.id, event_id } });
      const submission = await RsvpSubmission.create({
        guest_id: guest.id,
        event_id,
        couple_id: guest.couple_id,
        attending,
        meal_choice,
        dietary_note,
        song_request,
        custom_answers: custom_answers || {},
        submitted_at: new Date(),
      });
      created.push(submission);
    }

    // Emit real-time socket event
    emitRsvpSubmitted(guest.couple_id, {
      guest_id: guest.id,
      guest_name: `${guest.first_name} ${guest.last_name || ''}`.trim(),
      submissions: created,
    });

    return success(res, { submitted: created.length }, 'RSVP submitted successfully. Thank you!');
  } catch (err) {
    console.error('submitRsvp error:', err);
    error(res, 'Failed to submit RSVP.', 500);
  }
};

/**
 * GET /api/rsvp/quick/:token/:eventId/:response
 * Public: One-click RSVP from an email link (yes/no/maybe) for a single
 * event - no form required. Redirects to the full RSVP page afterwards so
 * the guest can still add meal choice, plus-one, etc. if they want to.
 */
const quickRsvp = async (req, res) => {
  const baseUrl = toOrigin(process.env.FRONTEND_URL, 'http://localhost:3000').replace(/\/+$/, '');
  const { token, eventId, response } = req.params;
  const fallback = () => res.redirect(`${baseUrl}/rsvp/${token}`);

  try {
    if (!['yes', 'no', 'maybe'].includes(response)) return fallback();

    const guest = await Guest.findOne({ where: { rsvp_token: token } });
    if (!guest) return fallback();

    const access = await EventGuestAccess.findOne({ where: { guest_id: guest.id, event_id: eventId } });
    if (!access) return fallback();

    await RsvpSubmission.destroy({ where: { guest_id: guest.id, event_id: eventId } });
    const submission = await RsvpSubmission.create({
      guest_id: guest.id,
      event_id: eventId,
      couple_id: guest.couple_id,
      attending: response,
      custom_answers: {},
      submitted_at: new Date(),
    });

    emitRsvpSubmitted(guest.couple_id, {
      guest_id: guest.id,
      guest_name: `${guest.first_name} ${guest.last_name || ''}`.trim(),
      submissions: [submission],
    });

    return res.redirect(`${baseUrl}/rsvp/${token}?quick=${response}&event=${eventId}`);
  } catch (err) {
    console.error('quickRsvp error:', err);
    return fallback();
  }
};

/**
 * GET /api/rsvp/responses
 * Protected: Get all RSVP responses for the couple.
 */
const getResponses = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const { event_id, attending, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const where = { couple_id: coupleId };
    if (event_id) where.event_id = event_id;
    if (attending) where.attending = attending;

    const { count, rows } = await RsvpSubmission.findAndCountAll({
      where,
      include: [
        { model: Guest, as: 'guest', attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'plus_one_name', 'arrival_datetime', 'travel_mode', 'travel_details', 'party_size', 'party_member_names', 'departure_datetime', 'luggage_count', ...TRAVEL_TEXT_FIELDS] },
        { model: Event, as: 'event', attributes: ['id', 'title', 'event_type'] },
      ],
      limit: parseInt(limit, 10),
      offset,
      order: [['submitted_at', 'DESC']],
    });

    return paginated(res, rows, count, page, limit, 'RSVP responses retrieved.');
  } catch (err) {
    console.error('getResponses error:', err);
    error(res, 'Failed to retrieve RSVP responses.', 500);
  }
};

/**
 * GET /api/rsvp/stats
 * Protected: Attendance counts per event.
 */
const getStats = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;

    const events = await Event.findAll({ where: { couple_id: coupleId } });
    const stats = await Promise.all(
      events.map(async (event) => {
        const totalInvited = await EventGuestAccess.count({ where: { event_id: event.id } });
        const submissions = await RsvpSubmission.findAll({
          where: { couple_id: coupleId, event_id: event.id },
          attributes: ['attending'],
          raw: true,
        });
        const counts = submissions.reduce(
          (acc, s) => {
            acc[s.attending] = (acc[s.attending] || 0) + 1;
            return acc;
          },
          { yes: 0, no: 0, maybe: 0 }
        );
        return {
          eventId: event.id,
          eventTitle: event.title,
          attending: counts.yes,
          declined: counts.no,
          maybe: counts.maybe,
          // Invited guests who haven't submitted an RSVP at all yet.
          pending: Math.max(totalInvited - submissions.length, 0),
          total: totalInvited,
        };
      })
    );

    return success(res, stats, 'RSVP stats retrieved.');
  } catch (err) {
    console.error('getStats error:', err);
    error(res, 'Failed to retrieve RSVP stats.', 500);
  }
};

// ─── RSVP Questions ───────────────────────────────────────────────────────────

const getQuestions = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const questions = await RsvpQuestion.findAll({
      where: { couple_id: coupleId },
      order: [['sort_order', 'ASC']],
    });
    return success(res, questions, 'RSVP questions retrieved.');
  } catch (err) {
    console.error('getQuestions error:', err);
    error(res, 'Failed to retrieve questions.', 500);
  }
};

const createQuestion = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const { question_text, question_type, options, is_required, sort_order, event_id } = req.body;
    if (!question_text) return error(res, 'question_text is required.', 400);

    const q = await RsvpQuestion.create({
      couple_id: coupleId,
      event_id: event_id || null,
      question_text,
      question_type: question_type || 'text',
      options: options || [],
      is_required: is_required || false,
      sort_order: sort_order || 0,
    });
    return success(res, q, 'Question created.', 201);
  } catch (err) {
    console.error('createQuestion error:', err);
    error(res, 'Failed to create question.', 500);
  }
};

const updateQuestion = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const q = await RsvpQuestion.findOne({ where: { id: req.params.id, couple_id: coupleId } });
    if (!q) return error(res, 'Question not found.', 404);

    const { question_text, question_type, options, is_required, sort_order, event_id } = req.body;
    await q.update({
      question_text: question_text ?? q.question_text,
      question_type: question_type ?? q.question_type,
      options: options ?? q.options,
      is_required: is_required ?? q.is_required,
      sort_order: sort_order ?? q.sort_order,
      event_id: event_id !== undefined ? event_id : q.event_id,
    });
    return success(res, q, 'Question updated.');
  } catch (err) {
    console.error('updateQuestion error:', err);
    error(res, 'Failed to update question.', 500);
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const q = await RsvpQuestion.findOne({ where: { id: req.params.id, couple_id: coupleId } });
    if (!q) return error(res, 'Question not found.', 404);
    await q.destroy();
    return success(res, null, 'Question deleted.');
  } catch (err) {
    console.error('deleteQuestion error:', err);
    error(res, 'Failed to delete question.', 500);
  }
};

/**
 * POST /api/rsvp/send-invites
 * Send RSVP invitations to selected guests (or all guests with an email).
 */
const sendInvites = async (req, res) => {
  try {
    const couple = req.user.coupleProfile;
    const guestIds = req.body.guest_ids || req.body.guestIds;
    const eventId = req.body.event_id || req.body.eventId;
    const where = { couple_id: couple.id, email: { [Op.ne]: null } };
    if (Array.isArray(guestIds) && guestIds.length) where.id = guestIds;

    const guests = await Guest.findAll({ where });

    // If an event was specified, this invite is for that event specifically:
    // grant the invited guests access to it (so it shows up on their RSVP
    // page) and personalize the email with that event's own details.
    let event = null;
    if (eventId) {
      event = await Event.findOne({ where: { id: eventId, couple_id: couple.id } });
      if (!event) return error(res, 'Event not found.', 404);
      if (guests.length) {
        await EventGuestAccess.bulkCreate(
          guests.map((g) => ({ event_id: event.id, guest_id: g.id })),
          { ignoreDuplicates: true }
        );
      }
    } else if (guests.length) {
      // "All Events" / generic invite: grant access to every one of the
      // couple's events so the guest's RSVP page actually shows all of
      // them, not just whatever they happened to be granted before.
      const allEvents = await Event.findAll({ where: { couple_id: couple.id }, attributes: ['id'] });
      if (allEvents.length) {
        const records = [];
        for (const g of guests) {
          for (const e of allEvents) records.push({ event_id: e.id, guest_id: g.id });
        }
        await EventGuestAccess.bulkCreate(records, { ignoreDuplicates: true });
      }
    }

    const baseUrl = toOrigin(process.env.FRONTEND_URL, 'http://localhost:3000').replace(/\/+$/, '');
    let sent = 0;
    let failed = 0;
    for (const guest of guests) {
      try {
        // Scope this invite's link to the event it's about, so opening it
        // shows just that event - even if the guest has since been granted
        // access to others via a separate invite. Their other invites still
        // work; a "view all" link on the RSVP page lets them see everything.
        const rsvpLink = event
          ? `${baseUrl}/rsvp/${guest.rsvp_token}?event=${event.id}`
          : `${baseUrl}/rsvp/${guest.rsvp_token}`;
        await sendInvitation(guest, couple, rsvpLink, event);
        sent++;
      } catch (inviteErr) {
        console.error(`Invitation failed for ${guest.email}:`, inviteErr.message);
        failed++;
      }
    }
    return success(res, { sent, failed, total: guests.length }, 'Invitation processing complete.');
  } catch (err) {
    console.error('sendInvites error:', err);
    error(res, 'Failed to send invitations.', 500);
  }
};

module.exports = {
  getPublicRsvpForm,
  submitRsvp,
  quickRsvp,
  getResponses,
  getStats,
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  sendInvites,
};
