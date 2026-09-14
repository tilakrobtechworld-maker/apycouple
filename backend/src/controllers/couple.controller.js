'use strict';

const { CoupleProfile, User, Guest, Event, MediaGallery, RsvpSubmission, Theme } = require('../models');
const { success, error } = require('../utils/apiResponse');
const cloudinary = require('../config/cloudinary');
const { getFileUrl } = require('../utils/getFileUrl');

/**
 * GET /api/couple/profile
 * Get the authenticated couple's profile.
 */
const getProfile = async (req, res) => {
  try {
    const profile = await CoupleProfile.findOne({
      where: { user_id: req.user.id },
      include: [{ model: Theme, as: 'theme' }],
    });
    if (!profile) return error(res, 'Profile not found.', 404);
    return success(res, profile, 'Profile retrieved.');
  } catch (err) {
    console.error('getProfile error:', err);
    error(res, 'Failed to retrieve profile.', 500);
  }
};

/**
 * PUT /api/couple/profile
 * Update bride/groom names, wedding date, hashtag, story, etc.
 */
const updateProfile = async (req, res) => {
  try {
    const {
      bride_name,
      groom_name,
      couple_display_name,
      wedding_date,
      custom_domain,
      wedding_hashtag,
      about_story,
      sections_order,
    } = req.body;

    const profile = await CoupleProfile.findOne({ where: { user_id: req.user.id } });
    if (!profile) return error(res, 'Profile not found.', 404);

    await profile.update({
      bride_name: bride_name !== undefined ? bride_name : profile.bride_name,
      groom_name: groom_name !== undefined ? groom_name : profile.groom_name,
      couple_display_name: couple_display_name !== undefined ? couple_display_name : profile.couple_display_name,
      wedding_date: wedding_date !== undefined ? wedding_date : profile.wedding_date,
      custom_domain: custom_domain !== undefined ? custom_domain : profile.custom_domain,
      wedding_hashtag: wedding_hashtag !== undefined ? wedding_hashtag : profile.wedding_hashtag,
      about_story: about_story !== undefined ? about_story : profile.about_story,
      sections_order: sections_order !== undefined ? sections_order : profile.sections_order,
    });

    return success(res, profile, 'Profile updated successfully.');
  } catch (err) {
    console.error('updateProfile error:', err);
    error(res, 'Failed to update profile.', 500);
  }
};

/**
 * PUT /api/couple/theme
 * Set theme_id and/or theme_config overrides.
 */
const updateTheme = async (req, res) => {
  try {
    const { theme_id, theme_config, sections_order } = req.body;

    const profile = await CoupleProfile.findOne({ where: { user_id: req.user.id } });
    if (!profile) return error(res, 'Profile not found.', 404);

    // Verify theme exists if provided
    if (theme_id) {
      const theme = await Theme.findByPk(theme_id);
      if (!theme) return error(res, 'Theme not found.', 404);
    }

    await profile.update({
      theme_id: theme_id !== undefined ? theme_id : profile.theme_id,
      theme_config: theme_config !== undefined ? theme_config : profile.theme_config,
      sections_order: sections_order !== undefined ? sections_order : profile.sections_order,
    });

    const updatedProfile = await CoupleProfile.findByPk(profile.id, {
      include: [{ model: Theme, as: 'theme' }],
    });

    return success(res, updatedProfile, 'Theme updated successfully.');
  } catch (err) {
    console.error('updateTheme error:', err);
    error(res, 'Failed to update theme.', 500);
  }
};

/**
 * POST /api/couple/cover-photo
 * Upload and set the couple's cover photo via Cloudinary.
 */
const updateCoverPhoto = async (req, res) => {
  try {
    if (!req.file) return error(res, 'No photo file provided.', 400);

    const profile = await CoupleProfile.findOne({ where: { user_id: req.user.id } });
    if (!profile) return error(res, 'Profile not found.', 404);

    // Delete old cover photo from Cloudinary if present
    if (profile.cover_photo_url) {
      const oldPublicId = profile.cover_photo_url.split('/').slice(-1)[0].split('.')[0];
      await cloudinary.uploader.destroy(`appycouple/photos/${oldPublicId}`).catch(() => null);
    }

    const cover_photo_url = getFileUrl(req, req.file);
    await profile.update({ cover_photo_url });

    return success(res, { cover_photo_url }, 'Cover photo updated.');
  } catch (err) {
    console.error('updateCoverPhoto error:', err);
    error(res, 'Failed to upload cover photo.', 500);
  }
};

/**
 * POST /api/couple/publish
 * Set website_published = true.
 */
const publishWebsite = async (req, res) => {
  try {
    const profile = await CoupleProfile.findOne({ where: { user_id: req.user.id } });
    if (!profile) return error(res, 'Profile not found.', 404);

    if (!profile.custom_slug) {
      return error(res, 'Cannot publish without a website slug.', 400);
    }

    await profile.update({ website_published: true });
    return success(res, { website_published: true, custom_slug: profile.custom_slug }, 'Website published.');
  } catch (err) {
    console.error('publishWebsite error:', err);
    error(res, 'Failed to publish website.', 500);
  }
};

/**
 * POST /api/couple/unpublish
 * Set website_published = false.
 */
const unpublishWebsite = async (req, res) => {
  try {
    const profile = await CoupleProfile.findOne({ where: { user_id: req.user.id } });
    if (!profile) return error(res, 'Profile not found.', 404);

    await profile.update({ website_published: false });
    return success(res, { website_published: false }, 'Website unpublished.');
  } catch (err) {
    console.error('unpublishWebsite error:', err);
    error(res, 'Failed to unpublish website.', 500);
  }
};

/**
 * GET /api/couple/dashboard
 * Return aggregate stats for the couple's dashboard.
 */
const getDashboardStats = async (req, res) => {
  try {
    const profile = req.user.coupleProfile;
    if (!profile) return error(res, 'Profile not found.', 404);

    const coupleId = profile.id;

    const [totalGuests, totalEvents, totalPhotos, rsvpStats] = await Promise.all([
      Guest.count({ where: { couple_id: coupleId } }),
      Event.count({ where: { couple_id: coupleId } }),
      MediaGallery.count({ where: { couple_id: coupleId, is_approved: true } }),
      RsvpSubmission.findAll({
        where: { couple_id: coupleId },
        attributes: ['attending'],
        raw: true,
      }),
    ]);

    const rsvpCounts = rsvpStats.reduce(
      (acc, r) => {
        acc[r.attending] = (acc[r.attending] || 0) + 1;
        return acc;
      },
      { yes: 0, no: 0, maybe: 0 }
    );

    return success(res, {
      totalGuests,
      totalEvents,
      totalPhotos,
      rsvp: rsvpCounts,
      totalRsvps: rsvpStats.length,
    }, 'Dashboard stats retrieved.');
  } catch (err) {
    console.error('getDashboardStats error:', err);
    error(res, 'Failed to retrieve dashboard stats.', 500);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updateTheme,
  updateCoverPhoto,
  publishWebsite,
  unpublishWebsite,
  getDashboardStats,
};
