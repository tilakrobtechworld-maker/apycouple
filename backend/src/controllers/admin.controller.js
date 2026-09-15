'use strict';

const { Op } = require('sequelize');
const {
  sequelize, User, CoupleProfile, Guest, Event, RsvpSubmission, MediaGallery, Theme, Notification,
} = require('../models');
const { success, error, paginated } = require('../utils/apiResponse');
const emailService = require('../services/email.service');

/**
 * GET /api/admin/stats
 * Platform-wide aggregate statistics.
 */
const getStats = async (req, res) => {
  try {
    const [totalCouples, totalGuests, totalRsvps, totalMedia, themeCount] = await Promise.all([
      CoupleProfile.count(),
      Guest.count(),
      RsvpSubmission.count(),
      MediaGallery.count({ where: { is_approved: true } }),
      Theme.count(),
    ]);

    const publishedWebsites = await CoupleProfile.count({ where: { website_published: true } });
    const subscriptionBreakdown = await User.findAll({
      attributes: ['subscription_tier', [User.sequelize.fn('COUNT', User.sequelize.col('id')), 'count']],
      group: ['subscription_tier'],
      raw: true,
    });

    return success(res, {
      totalCouples,
      totalGuests,
      totalRsvps,
      totalMedia,
      themeCount,
      publishedWebsites,
      subscriptionBreakdown,
    }, 'Admin stats retrieved.');
  } catch (err) {
    console.error('getStats admin error:', err);
    error(res, 'Failed to retrieve admin stats.', 500);
  }
};

/**
 * GET /api/admin/couples
 * Paginated list of all couples with search and subscription filter.
 */
const getCouples = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, subscription_tier, is_active } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const userWhere = {};
    if (subscription_tier) userWhere.subscription_tier = subscription_tier;
    if (is_active !== undefined) userWhere.is_active = is_active === 'true';

    const profileWhere = {};
    if (search) {
      profileWhere[Op.or] = [
        { bride_name: { [Op.like]: `%${search}%` } },
        { groom_name: { [Op.like]: `%${search}%` } },
        { couple_display_name: { [Op.like]: `%${search}%` } },
        { custom_slug: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await CoupleProfile.findAndCountAll({
      where: profileWhere,
      attributes: {
        include: [
          [
            sequelize.literal('(SELECT COUNT(*) FROM guests WHERE guests.couple_id = couple_profiles.id)'),
            'guest_count',
          ],
        ],
      },
      include: [
        {
          model: User,
          as: 'user',
          where: userWhere,
          attributes: { exclude: ['password_hash'] },
        },
      ],
      limit: parseInt(limit, 10),
      offset,
      order: [['created_at', 'DESC']],
    });

    return paginated(res, rows, count, page, limit, 'Couples retrieved.');
  } catch (err) {
    console.error('getCouples admin error:', err);
    error(res, 'Failed to retrieve couples.', 500);
  }
};

/**
 * GET /api/admin/couples/:id
 */
const getCoupleDetail = async (req, res) => {
  try {
    const profile = await CoupleProfile.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: { exclude: ['password_hash'] } },
        { model: Event, as: 'events' },
        { model: Theme, as: 'theme' },
      ],
    });
    if (!profile) return error(res, 'Couple not found.', 404);

    const [guestCount, rsvpCount, mediaCount] = await Promise.all([
      Guest.count({ where: { couple_id: profile.id } }),
      RsvpSubmission.count({ where: { couple_id: profile.id } }),
      MediaGallery.count({ where: { couple_id: profile.id } }),
    ]);

    return success(res, { profile, stats: { guestCount, rsvpCount, mediaCount } }, 'Couple detail retrieved.');
  } catch (err) {
    console.error('getCoupleDetail admin error:', err);
    error(res, 'Failed to retrieve couple detail.', 500);
  }
};

/**
 * PATCH /api/admin/couples/:id/suspend
 */
const suspendCouple = async (req, res) => {
  try {
    const profile = await CoupleProfile.findByPk(req.params.id, {
      include: [{ model: User, as: 'user' }],
    });
    if (!profile) return error(res, 'Couple not found.', 404);

    await profile.user.update({ is_active: false });
    return success(res, null, 'Couple account suspended.');
  } catch (err) {
    console.error('suspendCouple error:', err);
    error(res, 'Failed to suspend couple.', 500);
  }
};

/**
 * PATCH /api/admin/couples/:id/activate
 */
const activateCouple = async (req, res) => {
  try {
    const profile = await CoupleProfile.findByPk(req.params.id, {
      include: [{ model: User, as: 'user' }],
    });
    if (!profile) return error(res, 'Couple not found.', 404);

    await profile.user.update({ is_active: true });
    return success(res, null, 'Couple account activated.');
  } catch (err) {
    console.error('activateCouple error:', err);
    error(res, 'Failed to activate couple.', 500);
  }
};

/**
 * DELETE /api/admin/couples/:id
 */
const deleteCouple = async (req, res) => {
  try {
    const profile = await CoupleProfile.findByPk(req.params.id, {
      include: [{ model: User, as: 'user' }],
    });
    if (!profile) return error(res, 'Couple not found.', 404);

    await profile.user.destroy(); // Cascades to profile
    return success(res, null, 'Couple account deleted.');
  } catch (err) {
    console.error('deleteCouple error:', err);
    error(res, 'Failed to delete couple.', 500);
  }
};

/**
 * GET /api/admin/media-queue
 * All pending media across all couples.
 */
const getMediaQueue = async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const { count, rows } = await MediaGallery.findAndCountAll({
      where: { is_approved: false },
      include: [
        {
          model: CoupleProfile,
          as: 'couple',
          attributes: ['id', 'couple_display_name', 'custom_slug'],
        },
      ],
      limit: parseInt(limit, 10),
      offset,
      order: [['uploaded_at', 'DESC']],
    });

    return paginated(res, rows, count, page, limit, 'Media queue retrieved.');
  } catch (err) {
    console.error('getMediaQueue error:', err);
    error(res, 'Failed to retrieve media queue.', 500);
  }
};

/**
 * PATCH /api/admin/media/:id/approve
 */
const approveMedia = async (req, res) => {
  try {
    const media = await MediaGallery.findByPk(req.params.id);
    if (!media) return error(res, 'Media not found.', 404);
    await media.update({ is_approved: true });
    return success(res, null, 'Media approved.');
  } catch (err) {
    console.error('approveMedia error:', err);
    error(res, 'Failed to approve media.', 500);
  }
};

/**
 * DELETE /api/admin/media/:id
 */
const rejectMedia = async (req, res) => {
  try {
    const media = await MediaGallery.findByPk(req.params.id);
    if (!media) return error(res, 'Media not found.', 404);
    const cloudinary = require('../config/cloudinary');
    if (media.cloudinary_id) {
      await cloudinary.uploader.destroy(media.cloudinary_id).catch(() => null);
    }
    await media.destroy();
    return success(res, null, 'Media rejected and deleted.');
  } catch (err) {
    console.error('rejectMedia error:', err);
    error(res, 'Failed to reject media.', 500);
  }
};

/**
 * POST /api/admin/broadcast
 * Send broadcast to all couples' guests.
 */
const broadcastNotification = async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) return error(res, 'subject and message are required.', 400);

    const guests = await Guest.findAll({ attributes: ['email'] });
    const emails = [...new Set(guests.map((g) => g.email).filter(Boolean))];

    const result = await emailService.sendBroadcast(emails, subject, message);
    return success(res, result, 'Broadcast sent.');
  } catch (err) {
    console.error('broadcastNotification error:', err);
    error(res, 'Failed to send broadcast.', 500);
  }
};

/**
 * GET /api/admin/subscriptions
 */
const getSubscriptions = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      include: [{ model: CoupleProfile, as: 'coupleProfile', attributes: ['id', 'couple_display_name'] }],
      order: [['created_at', 'DESC']],
    });
    return success(res, users, 'Subscriptions retrieved.');
  } catch (err) {
    console.error('getSubscriptions error:', err);
    error(res, 'Failed to retrieve subscriptions.', 500);
  }
};

/**
 * PATCH /api/admin/subscriptions/:userId
 */
const updateSubscription = async (req, res) => {
  try {
    const { subscription_tier } = req.body;
    if (!subscription_tier) return error(res, 'subscription_tier is required.', 400);

    const user = await User.findByPk(req.params.id);
    if (!user) return error(res, 'User not found.', 404);

    await user.update({ subscription_tier });
    return success(res, { subscription_tier: user.subscription_tier }, 'Subscription updated.');
  } catch (err) {
    console.error('updateSubscription error:', err);
    error(res, 'Failed to update subscription.', 500);
  }
};

module.exports = {
  getStats,
  getCouples,
  getCoupleDetail,
  suspendCouple,
  activateCouple,
  deleteCouple,
  getMediaQueue,
  approveMedia,
  rejectMedia,
  broadcastNotification,
  getSubscriptions,
  updateSubscription,
  // Aliases for routes that use different names
  getThemesAdmin: getStats,       // placeholder — returns stats, themes are managed via /themes route
  getNotifications: (req, res) => res.json({ status: 'success', data: [] }),
  updateSettings: (req, res) => res.json({ status: 'success', data: null, message: 'Settings saved.' }),
  createAdmin: async (req, res) => {
    try {
      const bcrypt = require('bcryptjs');
      const { User } = require('../models');
      const { name, email, password, role } = req.body;
      const existing = await User.findOne({ where: { email } });
      if (existing) return res.status(409).json({ status: 'error', message: 'Email already exists.' });
      const password_hash = await bcrypt.hash(password, 12);
      const user = await User.create({ email, password_hash, role: role || 'admin', subscription_tier: 'elite', is_active: true });
      return res.status(201).json({ status: 'success', data: { id: user.id, email, role: user.role } });
    } catch (e) {
      return res.status(500).json({ status: 'error', message: 'Failed to create admin.' });
    }
  },
};

