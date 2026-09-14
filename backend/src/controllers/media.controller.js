'use strict';

const { Op } = require('sequelize');
const { MediaGallery, Guest, CoupleProfile } = require('../models');
const { success, error, paginated } = require('../utils/apiResponse');
const cloudinary = require('../config/cloudinary');
const { emitNewPhoto } = require('../services/socket.service');
const { getFileUrl } = require('../utils/getFileUrl');

/**
 * POST /api/media/upload
 * Upload photo/video to Cloudinary and create MediaGallery record.
 * Auth: couple or guest via token header.
 */
const upload = async (req, res) => {
  try {
    if (!req.file) return error(res, 'No media file provided.', 400);

    const { caption, uploader_name, guest_rsvp_token } = req.body;
    let coupleId, uploaderGuestId;

    if (req.user) {
      // Couple uploading their own photos
      coupleId = req.user.coupleProfile?.id;
      if (!coupleId) return error(res, 'Couple profile not found.', 404);
    } else if (guest_rsvp_token) {
      // Guest uploading by RSVP token
      const guest = await Guest.findOne({ where: { rsvp_token: guest_rsvp_token } });
      if (!guest) return error(res, 'Invalid RSVP token.', 401);
      coupleId = guest.couple_id;
      uploaderGuestId = guest.id;
    } else {
      return error(res, 'Authentication required.', 401);
    }

    const isVideo = req.file.mimetype?.startsWith('video/');
    const fileUrl = getFileUrl(req, req.file);
    const media = await MediaGallery.create({
      couple_id: coupleId,
      uploader_guest_id: uploaderGuestId || null,
      uploader_name: uploader_name || null,
      media_url: fileUrl,
      thumbnail_url: isVideo ? null : fileUrl,
      cloudinary_id: req.file.filename || req.file.public_id,
      media_type: isVideo ? 'video' : 'photo',
      caption: caption || null,
      is_approved: req.user ? true : false, // Couple uploads auto-approved
      uploaded_at: new Date(),
    });

    // Emit socket event for live photo stream
    if (media.is_approved) {
      emitNewPhoto(coupleId, media.toJSON());
    }

    return success(res, media, 'Media uploaded successfully.', 201);
  } catch (err) {
    console.error('upload media error:', err);
    error(res, 'Failed to upload media.', 500);
  }
};

/**
 * GET /api/media
 * Protected: get the logged-in couple's own media, optionally filtered by
 * ?approved=true/false. Used by the dashboard (not the public gallery,
 * which is scoped by slug/couple_id via getApproved below).
 */
const getAll = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const { approved, limit } = req.query;

    const where = { couple_id: coupleId };
    if (approved !== undefined) where.is_approved = approved === 'true';

    const media = await MediaGallery.findAll({
      where,
      include: [{ model: Guest, as: 'uploaderGuest', attributes: ['id', 'first_name', 'last_name'], required: false }],
      order: [['is_featured', 'DESC'], ['uploaded_at', 'DESC']],
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return success(res, media, 'Media retrieved.');
  } catch (err) {
    console.error('getAll media error:', err);
    error(res, 'Failed to retrieve media.', 500);
  }
};

/**
 * GET /api/media/approved
 * Public: Get approved media for a couple by slug.
 */
const getApproved = async (req, res) => {
  try {
    const { slug, couple_id, page = 1, limit = 24 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let coupleId = couple_id;
    if (!coupleId && slug) {
      const profile = await CoupleProfile.findOne({ where: { custom_slug: slug } });
      if (!profile) return error(res, 'Couple not found.', 404);
      coupleId = profile.id;
    }
    if (!coupleId) return error(res, 'couple_id or slug is required.', 400);

    const { count, rows } = await MediaGallery.findAndCountAll({
      where: { couple_id: coupleId, is_approved: true },
      order: [['is_featured', 'DESC'], ['uploaded_at', 'DESC']],
      limit: parseInt(limit, 10),
      offset,
    });

    return paginated(res, rows, count, page, limit, 'Gallery retrieved.');
  } catch (err) {
    console.error('getApproved error:', err);
    error(res, 'Failed to retrieve gallery.', 500);
  }
};

/**
 * GET /api/media/pending
 * Protected: Get pending (unapproved) media for moderation.
 */
const getPending = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const pending = await MediaGallery.findAll({
      where: { couple_id: coupleId, is_approved: false },
      include: [{ model: Guest, as: 'uploaderGuest', attributes: ['id', 'first_name', 'last_name'], required: false }],
      order: [['uploaded_at', 'DESC']],
    });
    return success(res, pending, 'Pending media retrieved.');
  } catch (err) {
    console.error('getPending error:', err);
    error(res, 'Failed to retrieve pending media.', 500);
  }
};

/**
 * PATCH /api/media/:id/approve
 */
const approve = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const media = await MediaGallery.findOne({ where: { id: req.params.id, couple_id: coupleId } });
    if (!media) return error(res, 'Media not found.', 404);

    await media.update({ is_approved: true });
    emitNewPhoto(coupleId, media.toJSON());

    return success(res, media, 'Media approved.');
  } catch (err) {
    console.error('approve media error:', err);
    error(res, 'Failed to approve media.', 500);
  }
};

/**
 * DELETE /api/media/:id
 * Reject/delete a media item (also removes from Cloudinary).
 */
const deleteMedia = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const media = await MediaGallery.findOne({ where: { id: req.params.id, couple_id: coupleId } });
    if (!media) return error(res, 'Media not found.', 404);

    // Delete from Cloudinary
    if (media.cloudinary_id) {
      const resourceType = media.media_type === 'video' ? 'video' : 'image';
      await cloudinary.uploader.destroy(media.cloudinary_id, { resource_type: resourceType }).catch(() => null);
    }

    await media.destroy();
    return success(res, null, 'Media deleted.');
  } catch (err) {
    console.error('deleteMedia error:', err);
    error(res, 'Failed to delete media.', 500);
  }
};

/**
 * POST /api/media/bulk-approve
 */
const bulkApprove = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return error(res, 'ids array is required.', 400);

    const { Op } = require('sequelize');
    const updated = await MediaGallery.update(
      { is_approved: true },
      { where: { id: { [Op.in]: ids }, couple_id: coupleId } }
    );

    return success(res, { approved: updated[0] }, `${updated[0]} media item(s) approved.`);
  } catch (err) {
    console.error('bulkApprove error:', err);
    error(res, 'Failed to bulk approve.', 500);
  }
};

/**
 * PATCH /api/media/:id/toggle-featured
 */
const toggleFeatured = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const media = await MediaGallery.findOne({ where: { id: req.params.id, couple_id: coupleId } });
    if (!media) return error(res, 'Media not found.', 404);
    await media.update({ is_featured: !media.is_featured });
    return success(res, { is_featured: media.is_featured }, 'Featured status toggled.');
  } catch (err) {
    console.error('toggleFeatured error:', err);
    error(res, 'Failed to toggle featured.', 500);
  }
};

// Stub for public gallery (guests browsing)
const getPublicGallery = async (req, res) => {
  try {
    const { coupleSlug } = req.params;
    const couple = await CoupleProfile.findOne({ where: { custom_slug: coupleSlug } });
    if (!couple) return error(res, 'Wedding not found.', 404);
    const media = await MediaGallery.findAll({
      where: { couple_id: couple.id, is_approved: true },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    return success(res, { media }, 'Gallery retrieved.');
  } catch (err) {
    console.error('getPublicGallery error:', err);
    error(res, 'Failed to get gallery.', 500);
  }
};

// Stub for guest upload by couple slug
const guestUpload = async (req, res) => {
  try {
    const { coupleSlug } = req.params;
    const couple = await CoupleProfile.findOne({ where: { custom_slug: coupleSlug } });
    if (!couple) return error(res, 'Wedding not found.', 404);

    if (!req.file) return error(res, 'No file uploaded.', 400);

    const { caption, uploader_name } = req.body;
    const mediaUrl = getFileUrl(req, req.file);

    const media = await MediaGallery.create({
      couple_id: couple.id,
      media_url: mediaUrl,
      thumbnail_url: mediaUrl,
      media_type: req.file.mimetype?.startsWith('video/') ? 'video' : 'photo',
      caption: caption || null,
      uploader_name: uploader_name || 'Guest',
      is_approved: false,
      is_featured: false,
    });

    return success(res, { media }, 'Photo uploaded! It will appear after approval.', 201);
  } catch (err) {
    console.error('guestUpload error:', err);
    error(res, 'Upload failed.', 500);
  }
};

module.exports = {
  upload,
  getAll,
  getApproved,
  getPending,
  approve,
  remove: deleteMedia,        // alias
  deleteMedia,
  bulkApprove,
  toggleFeatured,
  getPublicGallery,
  guestUpload,
};

