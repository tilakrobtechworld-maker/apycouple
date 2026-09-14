'use strict';

const { Notification, Guest, Event, CoupleProfile } = require('../models');
const { success, error } = require('../utils/apiResponse');
const emailService = require('../services/email.service');
const smsService = require('../services/sms.service');

/**
 * GET /api/notifications
 */
const getAll = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const notifications = await Notification.findAll({
      where: { couple_id: coupleId },
      include: [{ model: Event, as: 'targetEvent', required: false }],
      order: [['created_at', 'DESC']],
    });
    return success(res, notifications, 'Notifications retrieved.');
  } catch (err) {
    console.error('getAll notifications error:', err);
    error(res, 'Failed to retrieve notifications.', 500);
  }
};

/**
 * POST /api/notifications
 * Create a draft notification.
 */
const create = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const { title, message, notification_type, target_type, target_event_id } = req.body;
    if (!title || !message) return error(res, 'title and message are required.', 400);

    const notification = await Notification.create({
      couple_id: coupleId,
      title,
      message,
      notification_type: notification_type || 'email',
      target_type: target_type || 'all',
      target_event_id: target_event_id || null,
      status: 'draft',
    });
    return success(res, notification, 'Notification draft created.', 201);
  } catch (err) {
    console.error('create notification error:', err);
    error(res, 'Failed to create notification.', 500);
  }
};

/**
 * POST /api/notifications/:id/send
 * Send a notification to guests.
 */
const send = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const notification = await Notification.findOne({ where: { id: req.params.id, couple_id: coupleId } });
    if (!notification) return error(res, 'Notification not found.', 404);

    const couple = await CoupleProfile.findByPk(coupleId);

    // Determine recipients
    let guests = [];
    if (notification.target_type === 'all') {
      guests = await Guest.findAll({ where: { couple_id: coupleId } });
    } else if (notification.target_type === 'specific_event' && notification.target_event_id) {
      const { EventGuestAccess } = require('../models');
      const access = await EventGuestAccess.findAll({ where: { event_id: notification.target_event_id } });
      const guestIds = access.map((a) => a.guest_id);
      guests = await Guest.findAll({ where: { id: guestIds } });
    }

    let sentCount = 0;
    let failedCount = 0;

    if (notification.notification_type === 'email') {
      const recipients = guests.filter((g) => g.email).map((g) => g.email);
      const result = await emailService.sendBroadcast(
        recipients,
        notification.title,
        notification.message,
        couple
      );
      sentCount = result.sent;
      failedCount = result.failed;
    } else if (notification.notification_type === 'sms') {
      for (const guest of guests.filter((g) => g.phone)) {
        try {
          await smsService.sendAlert(guest.phone, `${notification.title}: ${notification.message}`);
          sentCount++;
        } catch {
          failedCount++;
        }
      }
    }

    await notification.update({
      status: failedCount === guests.length ? 'failed' : 'sent',
      sent_at: new Date(),
    });

    return success(res, { sent: sentCount, failed: failedCount }, 'Notification sent.');
  } catch (err) {
    console.error('send notification error:', err);
    error(res, 'Failed to send notification.', 500);
  }
};

/**
 * DELETE /api/notifications/:id
 */
const deleteNotification = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const notification = await Notification.findOne({ where: { id: req.params.id, couple_id: coupleId } });
    if (!notification) return error(res, 'Notification not found.', 404);
    await notification.destroy();
    return success(res, null, 'Notification deleted.');
  } catch (err) {
    console.error('deleteNotification error:', err);
    error(res, 'Failed to delete notification.', 500);
  }
};

module.exports = { getAll, create, send, deleteNotification, remove: deleteNotification };

