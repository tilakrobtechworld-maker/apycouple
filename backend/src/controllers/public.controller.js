'use strict';

const {
  CoupleProfile, Event, RegistryItem, TravelInfo, MediaGallery, GuestbookEntry, Theme, User,
  WeddingCard, CardTemplate,
} = require('../models');
const { success, error } = require('../utils/apiResponse');

/**
 * GET /api/public/website/:slug
 * Returns the complete wedding website data. Works for both published and preview.
 */
const getWebsite = async (req, res) => {
  try {
    const { slug } = req.params;

    const couple = await CoupleProfile.findOne({
      where: { custom_slug: slug },
      include: [
        { model: Theme, as: 'theme' },
        { model: User, as: 'user', attributes: ['subscription_tier'] },
      ],
    });

    if (!couple) {
      return error(res, 'Wedding website not found.', 404);
    }

    if (!couple.website_published) {
      return error(res, 'This wedding website has not been published yet.', 403);
    }

    // Fetch all public-facing data in parallel
    const [events, registry, travel, gallery, guestbook] = await Promise.all([
      Event.findAll({
        where: { couple_id: couple.id, is_public: true },
        order: [['start_time', 'ASC']],
      }),
      RegistryItem.findAll({
        where: { couple_id: couple.id },
        order: [['is_purchased', 'ASC'], ['createdAt', 'ASC']],
      }),
      TravelInfo.findAll({
        where: { couple_id: couple.id },
      }),
      MediaGallery.findAll({
        where: { couple_id: couple.id, is_approved: true },
        order: [['is_featured', 'DESC'], ['createdAt', 'DESC']],
        limit: 50,
      }),
      GuestbookEntry.findAll({
        where: { couple_id: couple.id, is_approved: true },
        order: [['createdAt', 'DESC']],
        limit: 20,
      }),
    ]);

    return success(res, {
      couple: {
        id: couple.id,
        bride_name: couple.bride_name,
        groom_name: couple.groom_name,
        couple_display_name: couple.couple_display_name,
        wedding_date: couple.wedding_date,
        cover_photo_url: couple.cover_photo_url,
        wedding_hashtag: couple.wedding_hashtag,
        about_story: couple.about_story,
        sections_order: couple.sections_order,
        theme_config: couple.theme_config,
        theme: couple.theme,
        custom_slug: couple.custom_slug,
      },
      events,
      registry,
      travel,
      gallery,
      guestbook,
    }, 'Wedding website data retrieved.');
  } catch (err) {
    console.error('getWebsite error:', err);
    error(res, 'Failed to retrieve wedding website.', 500);
  }
};

/**
 * GET /api/public/website/:slug/gallery
 */
const getGallery = async (req, res) => {
  try {
    const couple = await CoupleProfile.findOne({ where: { custom_slug: req.params.slug } });
    if (!couple) return error(res, 'Not found.', 404);
    const gallery = await MediaGallery.findAll({
      where: { couple_id: couple.id, is_approved: true },
      order: [['is_featured', 'DESC'], ['createdAt', 'DESC']],
    });
    return success(res, gallery, 'Gallery retrieved.');
  } catch (err) {
    error(res, 'Failed.', 500);
  }
};

/**
 * GET /api/public/website/:slug/guestbook
 */
const getGuestbook = async (req, res) => {
  try {
    const couple = await CoupleProfile.findOne({ where: { custom_slug: req.params.slug } });
    if (!couple) return error(res, 'Not found.', 404);
    const entries = await GuestbookEntry.findAll({
      where: { couple_id: couple.id, is_approved: true },
      order: [['createdAt', 'DESC']],
    });
    return success(res, entries, 'Guestbook retrieved.');
  } catch (err) {
    error(res, 'Failed.', 500);
  }
};

/**
 * GET /api/public/website/:slug/registry
 */
const getRegistry = async (req, res) => {
  try {
    const couple = await CoupleProfile.findOne({ where: { custom_slug: req.params.slug } });
    if (!couple) return error(res, 'Not found.', 404);
    const items = await RegistryItem.findAll({ where: { couple_id: couple.id } });
    return success(res, items, 'Registry retrieved.');
  } catch (err) {
    error(res, 'Failed.', 500);
  }
};

/**
 * GET /api/public/website/:slug/travel
 */
const getTravel = async (req, res) => {
  try {
    const couple = await CoupleProfile.findOne({ where: { custom_slug: req.params.slug } });
    if (!couple) return error(res, 'Not found.', 404);
    const items = await TravelInfo.findAll({ where: { couple_id: couple.id } });
    return success(res, items, 'Travel info retrieved.');
  } catch (err) {
    error(res, 'Failed.', 500);
  }
};

/**
 * GET /api/public/card/:slug
 * Returns a published wedding card for guests to view/download.
 */
const getCard = async (req, res) => {
  try {
    const card = await WeddingCard.findOne({
      where: { custom_slug: req.params.slug },
      include: [{ model: CardTemplate, as: 'template' }],
    });

    if (!card) return error(res, 'Wedding card not found.', 404);
    if (!card.is_published) return error(res, 'This wedding card has not been published yet.', 403);

    return success(res, card, 'Wedding card retrieved.');
  } catch (err) {
    console.error('getCard error:', err);
    error(res, 'Failed to retrieve wedding card.', 500);
  }
};

module.exports = { getWebsite, getGallery, getGuestbook, getRegistry, getTravel, getCard };
