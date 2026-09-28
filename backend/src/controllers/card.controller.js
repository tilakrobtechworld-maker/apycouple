'use strict';

const { WeddingCard, CardTemplate, CoupleProfile } = require('../models');
const { success, error } = require('../utils/apiResponse');
const { generateCardSlug } = require('../utils/generateSlug');

/**
 * GET /api/cards/me
 * Get (or lazily create) the logged-in couple's wedding card.
 */
const getMine = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    let card = await WeddingCard.findOne({
      where: { couple_id: coupleId },
      include: [{ model: CardTemplate, as: 'template' }],
    });

    if (!card) {
      card = await WeddingCard.create({ couple_id: coupleId, elements: [] });
      card = await WeddingCard.findOne({
        where: { id: card.id },
        include: [{ model: CardTemplate, as: 'template' }],
      });
    }

    // Couple data for the template's custom-HTML placeholders - already on
    // req.user from the auth middleware, no extra query needed.
    const { bride_name, groom_name, wedding_date, wedding_hashtag } = req.user.coupleProfile;
    const payload = { ...card.toJSON(), couple: { bride_name, groom_name, wedding_date, wedding_hashtag } };

    return success(res, payload, 'Wedding card retrieved.');
  } catch (err) {
    console.error('getMine card error:', err);
    error(res, 'Failed to retrieve wedding card.', 500);
  }
};

/**
 * PUT /api/cards/me
 * Save the couple's card: template selection, elements, canvas/background.
 */
const updateMine = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const { template_id, elements, canvas_width, canvas_height, background_color, background_image_url } = req.body;

    let card = await WeddingCard.findOne({ where: { couple_id: coupleId } });
    if (!card) card = await WeddingCard.create({ couple_id: coupleId });

    // Switching to a different template adopts its starter layout and
    // background, unless the couple explicitly sent their own values.
    let nextElements = elements;
    let nextBackgroundColor = background_color;
    let nextBackgroundImageUrl = background_image_url;
    if (template_id && template_id !== card.template_id) {
      const template = await CardTemplate.findByPk(template_id);
      if (template) {
        if (nextElements === undefined) nextElements = template.default_elements;
        if (nextBackgroundColor === undefined) nextBackgroundColor = template.background_color;
        if (nextBackgroundImageUrl === undefined) nextBackgroundImageUrl = template.background_image_url;
      }
    }

    await card.update({
      template_id: template_id !== undefined ? template_id : card.template_id,
      elements: nextElements !== undefined ? nextElements : card.elements,
      canvas_width: canvas_width !== undefined ? canvas_width : card.canvas_width,
      canvas_height: canvas_height !== undefined ? canvas_height : card.canvas_height,
      background_color: nextBackgroundColor !== undefined ? nextBackgroundColor : card.background_color,
      background_image_url: nextBackgroundImageUrl !== undefined ? nextBackgroundImageUrl : card.background_image_url,
    });

    return success(res, card, 'Wedding card saved.');
  } catch (err) {
    console.error('updateMine card error:', err);
    error(res, 'Failed to save wedding card.', 500);
  }
};

/**
 * PUT /api/cards/me/publish
 */
const publish = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const card = await WeddingCard.findOne({ where: { couple_id: coupleId } });
    if (!card) return error(res, 'Wedding card not found.', 404);

    if (!card.custom_slug) {
      const couple = await CoupleProfile.findByPk(coupleId);
      const slug = await generateCardSlug(couple?.bride_name, couple?.groom_name);
      await card.update({ custom_slug: slug, is_published: true });
    } else {
      await card.update({ is_published: true });
    }

    return success(res, card, 'Wedding card published.');
  } catch (err) {
    console.error('publish card error:', err);
    error(res, 'Failed to publish wedding card.', 500);
  }
};

/**
 * PUT /api/cards/me/unpublish
 */
const unpublish = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const card = await WeddingCard.findOne({ where: { couple_id: coupleId } });
    if (!card) return error(res, 'Wedding card not found.', 404);
    await card.update({ is_published: false });
    return success(res, card, 'Wedding card unpublished.');
  } catch (err) {
    console.error('unpublish card error:', err);
    error(res, 'Failed to unpublish wedding card.', 500);
  }
};

module.exports = { getMine, updateMine, publish, unpublish };
