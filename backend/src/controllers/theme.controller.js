'use strict';

const { Theme } = require('../models');
const { success, error } = require('../utils/apiResponse');
const { slugify } = require('../utils/generateSlug');

/**
 * GET /api/themes
 * Public: Get all active themes.
 */
const getAll = async (req, res) => {
  try {
    const themes = await Theme.findAll({
      where: { is_active: true },
      order: [['sort_order', 'ASC']],
    });
    return success(res, themes, 'Themes retrieved.');
  } catch (err) {
    console.error('getAll themes error:', err);
    error(res, 'Failed to retrieve themes.', 500);
  }
};

/**
 * GET /api/admin/themes
 * Admin: Get all themes including inactive.
 */
const getAllAdmin = async (req, res) => {
  try {
    const themes = await Theme.findAll({ order: [['sort_order', 'ASC']] });
    return success(res, themes, 'All themes retrieved.');
  } catch (err) {
    console.error('getAllAdmin themes error:', err);
    error(res, 'Failed to retrieve themes.', 500);
  }
};

/**
 * POST /api/admin/themes
 */
const create = async (req, res) => {
  try {
    const { name, description, preview_image_url, color_palette, font_pair, is_premium, sort_order } = req.body;
    if (!name) return error(res, 'name is required.', 400);

    const slug = slugify(name) + '-' + Date.now();
    const theme = await Theme.create({
      name, slug, description, preview_image_url,
      color_palette: color_palette || {},
      font_pair: font_pair || {},
      is_premium: is_premium || false,
      sort_order: sort_order || 0,
    });
    return success(res, theme, 'Theme created.', 201);
  } catch (err) {
    console.error('create theme error:', err);
    error(res, 'Failed to create theme.', 500);
  }
};

/**
 * PUT /api/admin/themes/:id
 */
const update = async (req, res) => {
  try {
    const theme = await Theme.findByPk(req.params.id);
    if (!theme) return error(res, 'Theme not found.', 404);

    const { name, description, preview_image_url, color_palette, font_pair, is_premium, sort_order } = req.body;
    await theme.update({
      name: name ?? theme.name,
      description: description ?? theme.description,
      preview_image_url: preview_image_url ?? theme.preview_image_url,
      color_palette: color_palette ?? theme.color_palette,
      font_pair: font_pair ?? theme.font_pair,
      is_premium: is_premium ?? theme.is_premium,
      sort_order: sort_order ?? theme.sort_order,
    });
    return success(res, theme, 'Theme updated.');
  } catch (err) {
    console.error('update theme error:', err);
    error(res, 'Failed to update theme.', 500);
  }
};

/**
 * DELETE /api/admin/themes/:id
 */
const deleteTheme = async (req, res) => {
  try {
    const theme = await Theme.findByPk(req.params.id);
    if (!theme) return error(res, 'Theme not found.', 404);
    await theme.destroy();
    return success(res, null, 'Theme deleted.');
  } catch (err) {
    console.error('deleteTheme error:', err);
    error(res, 'Failed to delete theme.', 500);
  }
};

/**
 * PATCH /api/admin/themes/:id/toggle-active
 */
const toggleActive = async (req, res) => {
  try {
    const theme = await Theme.findByPk(req.params.id);
    if (!theme) return error(res, 'Theme not found.', 404);
    await theme.update({ is_active: !theme.is_active });
    return success(res, { is_active: theme.is_active }, `Theme ${theme.is_active ? 'activated' : 'deactivated'}.`);
  } catch (err) {
    console.error('toggleActive theme error:', err);
    error(res, 'Failed to toggle theme.', 500);
  }
};

module.exports = { getAll, getAllAdmin, create, update, deleteTheme, remove: deleteTheme, toggleActive };

