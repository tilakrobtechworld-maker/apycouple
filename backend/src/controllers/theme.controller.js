'use strict';

const { Theme } = require('../models');
const { success, error } = require('../utils/apiResponse');
const { slugify } = require('../utils/generateSlug');
const { getFileUrl } = require('../utils/getFileUrl');
const aiService = require('../services/ai.service');

/**
 * POST /api/themes/upload-image (admin)
 * Accepts a preview image file (multer field "photo") and returns its
 * hosted URL for the admin form to use as preview_image_url.
 */
const uploadImage = async (req, res) => {
  try {
    if (!req.file) return error(res, 'No image file provided.', 400);
    const url = getFileUrl(req, req.file);
    return success(res, { url }, 'Image uploaded.');
  } catch (err) {
    console.error('uploadImage theme error:', err);
    error(res, 'Failed to upload image.', 500);
  }
};

/**
 * POST /api/themes/upload-model (admin)
 * Accepts a .glb/.gltf 3D model file (multer field "model") and returns its
 * hosted URL for the admin form to use as model_3d_url.
 */
const uploadModel = async (req, res) => {
  try {
    if (!req.file) return error(res, 'No model file provided.', 400);
    const url = getFileUrl(req, req.file);
    return success(res, { url }, 'Model uploaded.');
  } catch (err) {
    console.error('uploadModel theme error:', err);
    error(res, 'Failed to upload model.', 500);
  }
};

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
 * POST /api/themes/generate-ai (admin)
 * Uses Claude to draft a theme (name, description, colors, fonts) from a
 * free-text style prompt. Returns the draft only - nothing is saved until
 * the admin reviews it and submits the normal create form.
 */
const generateAI = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) return error(res, 'A style prompt is required.', 400);

    const draft = await aiService.generateTheme(prompt.trim());
    return success(res, draft, 'Theme draft generated.');
  } catch (err) {
    console.error('generateAI theme error:', err);
    error(res, err.message || 'Failed to generate theme.', err.statusCode || 500);
  }
};

/**
 * POST /api/admin/themes
 */
const create = async (req, res) => {
  try {
    const {
      name, description, preview_image_url, model_3d_url, color_palette, font_pair, is_premium, sort_order,
      custom_html, custom_css, custom_js, layout,
    } = req.body;
    if (!name) return error(res, 'name is required.', 400);

    const slug = slugify(name) + '-' + Date.now();
    const theme = await Theme.create({
      name, slug, description, preview_image_url, model_3d_url,
      color_palette: color_palette || {},
      font_pair: font_pair || {},
      is_premium: is_premium || false,
      sort_order: sort_order || 0,
      custom_html, custom_css, custom_js,
      layout: layout || 'classic',
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

    const {
      name, description, preview_image_url, model_3d_url, color_palette, font_pair, is_premium, sort_order,
      custom_html, custom_css, custom_js, layout,
    } = req.body;
    await theme.update({
      name: name ?? theme.name,
      description: description ?? theme.description,
      preview_image_url: preview_image_url ?? theme.preview_image_url,
      model_3d_url: model_3d_url ?? theme.model_3d_url,
      color_palette: color_palette ?? theme.color_palette,
      font_pair: font_pair ?? theme.font_pair,
      is_premium: is_premium ?? theme.is_premium,
      sort_order: sort_order ?? theme.sort_order,
      custom_html: custom_html ?? theme.custom_html,
      custom_css: custom_css ?? theme.custom_css,
      custom_js: custom_js ?? theme.custom_js,
      layout: layout ?? theme.layout,
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

module.exports = { getAll, getAllAdmin, create, update, deleteTheme, remove: deleteTheme, toggleActive, uploadImage, uploadModel, generateAI };

