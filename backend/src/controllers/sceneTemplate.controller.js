'use strict';

const { SceneTemplate } = require('../models');
const { success, error } = require('../utils/apiResponse');
const { slugify } = require('../utils/generateSlug');
const { getFileUrl } = require('../utils/getFileUrl');

/**
 * POST /api/scene-templates/upload-image (admin)
 * Accepts an image file (multer field "photo") - used for both the
 * template's thumbnail and for images the editor's "User Panel" applies as
 * textures onto image-plane objects in the scene.
 */
const uploadImage = async (req, res) => {
  try {
    if (!req.file) return error(res, 'No image file provided.', 400);
    const url = getFileUrl(req, req.file);
    return success(res, { url }, 'Image uploaded.');
  } catch (err) {
    console.error('uploadImage sceneTemplate error:', err);
    error(res, 'Failed to upload image.', 500);
  }
};

/**
 * GET /api/scene-templates
 * Public: active templates only.
 */
const getAll = async (req, res) => {
  try {
    const templates = await SceneTemplate.findAll({
      where: { is_active: true },
      order: [['sort_order', 'ASC']],
    });
    return success(res, templates, 'Scene templates retrieved.');
  } catch (err) {
    console.error('getAll sceneTemplates error:', err);
    error(res, 'Failed to retrieve scene templates.', 500);
  }
};

/**
 * GET /api/admin/scene-templates
 * Admin: all templates including inactive.
 */
const getAllAdmin = async (req, res) => {
  try {
    const templates = await SceneTemplate.findAll({ order: [['sort_order', 'ASC']] });
    return success(res, templates, 'All scene templates retrieved.');
  } catch (err) {
    console.error('getAllAdmin sceneTemplates error:', err);
    error(res, 'Failed to retrieve scene templates.', 500);
  }
};

/**
 * POST /api/scene-templates (admin)
 */
const create = async (req, res) => {
  try {
    const { name, description, thumbnail_url, scene_config, is_premium, sort_order } = req.body;
    if (!name) return error(res, 'name is required.', 400);

    const slug = slugify(name) + '-' + Date.now();
    const template = await SceneTemplate.create({
      name, slug, description, thumbnail_url,
      scene_config: scene_config || [],
      is_premium: is_premium || false,
      sort_order: sort_order || 0,
    });
    return success(res, template, 'Scene template created.', 201);
  } catch (err) {
    console.error('create sceneTemplate error:', err);
    error(res, 'Failed to create scene template.', 500);
  }
};

/**
 * PUT /api/scene-templates/:id (admin)
 */
const update = async (req, res) => {
  try {
    const template = await SceneTemplate.findByPk(req.params.id);
    if (!template) return error(res, 'Scene template not found.', 404);

    const { name, description, thumbnail_url, scene_config, is_premium, sort_order } = req.body;
    await template.update({
      name: name ?? template.name,
      description: description ?? template.description,
      thumbnail_url: thumbnail_url ?? template.thumbnail_url,
      scene_config: scene_config ?? template.scene_config,
      is_premium: is_premium ?? template.is_premium,
      sort_order: sort_order ?? template.sort_order,
    });
    return success(res, template, 'Scene template updated.');
  } catch (err) {
    console.error('update sceneTemplate error:', err);
    error(res, 'Failed to update scene template.', 500);
  }
};

/**
 * DELETE /api/scene-templates/:id (admin)
 */
const deleteSceneTemplate = async (req, res) => {
  try {
    const template = await SceneTemplate.findByPk(req.params.id);
    if (!template) return error(res, 'Scene template not found.', 404);
    await template.destroy();
    return success(res, null, 'Scene template deleted.');
  } catch (err) {
    console.error('deleteSceneTemplate error:', err);
    error(res, 'Failed to delete scene template.', 500);
  }
};

/**
 * PUT /api/scene-templates/:id/toggle (admin)
 */
const toggleActive = async (req, res) => {
  try {
    const template = await SceneTemplate.findByPk(req.params.id);
    if (!template) return error(res, 'Scene template not found.', 404);
    await template.update({ is_active: !template.is_active });
    return success(res, { is_active: template.is_active }, `Scene template ${template.is_active ? 'activated' : 'deactivated'}.`);
  } catch (err) {
    console.error('toggleActive sceneTemplate error:', err);
    error(res, 'Failed to toggle scene template.', 500);
  }
};

module.exports = { getAll, getAllAdmin, create, update, deleteSceneTemplate, remove: deleteSceneTemplate, toggleActive, uploadImage };
