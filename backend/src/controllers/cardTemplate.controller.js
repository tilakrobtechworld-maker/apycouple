'use strict';

const { CardTemplate } = require('../models');
const { success, error } = require('../utils/apiResponse');
const { slugify } = require('../utils/generateSlug');
const { extractImageColors } = require('../utils/extractImageColors');
const { getFileUrl } = require('../utils/getFileUrl');

/**
 * Build a sensible starter layout for a new template from simple fields,
 * so admins don't have to hand-author element JSON.
 */
const buildDefaultElements = ({ heading_font, body_font, text_color, canvas_width, canvas_height }) => {
  const w = canvas_width || 1080;
  const h = canvas_height || 1350;
  const headingFont = heading_font || 'Playfair Display';
  const bodyFont = body_font || 'Lato';
  const color = text_color || '#2c2c2c';

  return [
    {
      id: 'el-heading',
      type: 'text',
      x: Math.round(w * 0.1), y: Math.round(h * 0.42),
      width: Math.round(w * 0.8), height: Math.round(h * 0.12),
      rotation: 0, zIndex: 1,
      content: 'Bride & Groom',
      style: { fontFamily: headingFont, fontSize: Math.round(w * 0.07), color, textAlign: 'center', fontWeight: 700 },
    },
    {
      id: 'el-date',
      type: 'text',
      x: Math.round(w * 0.1), y: Math.round(h * 0.55),
      width: Math.round(w * 0.8), height: Math.round(h * 0.06),
      rotation: 0, zIndex: 1,
      content: 'Wedding Date',
      style: { fontFamily: bodyFont, fontSize: Math.round(w * 0.028), color, textAlign: 'center', fontWeight: 400 },
    },
  ];
};

/**
 * When an admin pastes a design image (e.g. a Canva export link), use it as
 * the card's actual background — not just a picker thumbnail — and derive
 * matching background/text colors from it automatically instead of making
 * the admin guess hex values by eye.
 */
const resolveDesignImage = async ({ preview_image_url, background_image_url, background_color, text_color }) => {
  const imageUrl = background_image_url || preview_image_url || null;
  const result = {
    background_image_url: imageUrl,
    background_color: background_color || '#fffaf0',
    text_color: text_color || '#2c2c2c',
  };

  if (!imageUrl) return result;

  // Let this throw — an image link that can't actually be read as an image
  // should block saving with a clear reason, not silently fall back to a
  // plain default that looks nothing like what the admin pasted.
  const { backgroundColor, textColor } = await extractImageColors(imageUrl);
  result.background_color = backgroundColor;
  result.text_color = textColor;

  return result;
};

/**
 * POST /api/card-templates/upload-image (admin)
 * Accepts an exported design file directly (multer field "photo") instead
 * of an external URL — sidesteps sites like Canva that block/redirect
 * server-side fetches of their share links. Returns the hosted URL so the
 * admin form can drop it straight into the design image field.
 */
const uploadImage = async (req, res) => {
  try {
    if (!req.file) return error(res, 'No image file provided.', 400);
    const url = getFileUrl(req, req.file);
    return success(res, { url }, 'Image uploaded.');
  } catch (err) {
    console.error('uploadImage card template error:', err);
    error(res, 'Failed to upload image.', 500);
  }
};

/**
 * GET /api/card-templates
 * Public: active templates only.
 */
const getAll = async (req, res) => {
  try {
    const templates = await CardTemplate.findAll({
      where: { is_active: true },
      order: [['sort_order', 'ASC']],
    });
    return success(res, templates, 'Card templates retrieved.');
  } catch (err) {
    console.error('getAll card templates error:', err);
    error(res, 'Failed to retrieve card templates.', 500);
  }
};

/**
 * GET /api/admin/card-templates
 * Admin: all templates including inactive.
 */
const getAllAdmin = async (req, res) => {
  try {
    const templates = await CardTemplate.findAll({ order: [['sort_order', 'ASC']] });
    return success(res, templates, 'All card templates retrieved.');
  } catch (err) {
    console.error('getAllAdmin card templates error:', err);
    error(res, 'Failed to retrieve card templates.', 500);
  }
};

/**
 * POST /api/card-templates (admin)
 */
const create = async (req, res) => {
  try {
    const {
      name, description, preview_image_url, canvas_width, canvas_height,
      background_color, background_image_url, heading_font, body_font, text_color,
      is_premium, sort_order, default_elements,
    } = req.body;
    if (!name) return error(res, 'name is required.', 400);

    let resolved;
    try {
      resolved = await resolveDesignImage({ preview_image_url, background_image_url, background_color, text_color });
    } catch (imgErr) {
      return error(res, imgErr.message, 400);
    }

    const slug = slugify(name) + '-' + Date.now();
    const template = await CardTemplate.create({
      name,
      slug,
      description,
      preview_image_url: preview_image_url || resolved.background_image_url,
      canvas_width: canvas_width || 1080,
      canvas_height: canvas_height || 1350,
      background_color: resolved.background_color,
      background_image_url: resolved.background_image_url,
      default_elements: default_elements || buildDefaultElements({ heading_font, body_font, text_color: resolved.text_color, canvas_width, canvas_height }),
      is_premium: is_premium || false,
      sort_order: sort_order || 0,
    });
    return success(res, template, 'Card template created.', 201);
  } catch (err) {
    console.error('create card template error:', err);
    error(res, 'Failed to create card template.', 500);
  }
};

/**
 * PUT /api/card-templates/:id (admin)
 */
const update = async (req, res) => {
  try {
    const template = await CardTemplate.findByPk(req.params.id);
    if (!template) return error(res, 'Card template not found.', 404);

    const {
      name, description, preview_image_url, canvas_width, canvas_height,
      background_color, background_image_url, is_premium, sort_order, default_elements,
    } = req.body;

    const newImageUrl = background_image_url ?? preview_image_url;
    const imageChanged = newImageUrl && newImageUrl !== (template.background_image_url || template.preview_image_url);

    let nextBackgroundColor = background_color ?? template.background_color;
    let nextBackgroundImageUrl = background_image_url ?? template.background_image_url;
    let nextPreviewImageUrl = preview_image_url ?? template.preview_image_url;

    if (imageChanged) {
      try {
        const resolved = await resolveDesignImage({ preview_image_url, background_image_url });
        nextBackgroundColor = resolved.background_color;
        nextBackgroundImageUrl = resolved.background_image_url;
        nextPreviewImageUrl = preview_image_url || resolved.background_image_url;
      } catch (imgErr) {
        return error(res, imgErr.message, 400);
      }
    }

    await template.update({
      name: name ?? template.name,
      description: description ?? template.description,
      preview_image_url: nextPreviewImageUrl,
      canvas_width: canvas_width ?? template.canvas_width,
      canvas_height: canvas_height ?? template.canvas_height,
      background_color: nextBackgroundColor,
      background_image_url: nextBackgroundImageUrl,
      is_premium: is_premium ?? template.is_premium,
      sort_order: sort_order ?? template.sort_order,
      default_elements: default_elements ?? template.default_elements,
    });
    return success(res, template, 'Card template updated.');
  } catch (err) {
    console.error('update card template error:', err);
    error(res, 'Failed to update card template.', 500);
  }
};

/**
 * DELETE /api/card-templates/:id (admin)
 */
const deleteCardTemplate = async (req, res) => {
  try {
    const template = await CardTemplate.findByPk(req.params.id);
    if (!template) return error(res, 'Card template not found.', 404);
    await template.destroy();
    return success(res, null, 'Card template deleted.');
  } catch (err) {
    console.error('deleteCardTemplate error:', err);
    error(res, 'Failed to delete card template.', 500);
  }
};

/**
 * PUT /api/card-templates/:id/toggle (admin)
 */
const toggleActive = async (req, res) => {
  try {
    const template = await CardTemplate.findByPk(req.params.id);
    if (!template) return error(res, 'Card template not found.', 404);
    await template.update({ is_active: !template.is_active });
    return success(res, { is_active: template.is_active }, `Card template ${template.is_active ? 'activated' : 'deactivated'}.`);
  } catch (err) {
    console.error('toggleActive card template error:', err);
    error(res, 'Failed to toggle card template.', 500);
  }
};

module.exports = { getAll, getAllAdmin, create, update, deleteCardTemplate, toggleActive, uploadImage };
