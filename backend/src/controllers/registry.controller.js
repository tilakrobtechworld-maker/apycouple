'use strict';

const { RegistryItem } = require('../models');
const { success, error } = require('../utils/apiResponse');

/**
 * GET /api/registry
 * Public/Protected: Get all registry items for a couple.
 */
const getAll = async (req, res) => {
  try {
    let coupleId = req.query.couple_id;
    if (!coupleId && req.user) coupleId = req.user.coupleProfile?.id;
    if (!coupleId) return error(res, 'couple_id is required.', 400);

    const items = await RegistryItem.findAll({
      where: { couple_id: coupleId },
      order: [['is_purchased', 'ASC'], ['created_at', 'DESC']],
    });
    return success(res, items, 'Registry items retrieved.');
  } catch (err) {
    console.error('getAll registry error:', err);
    error(res, 'Failed to retrieve registry.', 500);
  }
};

/**
 * POST /api/registry
 */
const create = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const { store_name, store_url, item_name, item_url, price, item_image_url, item_type, notes } = req.body;
    if (!item_name) return error(res, 'item_name is required.', 400);

    const item = await RegistryItem.create({
      couple_id: coupleId, store_name, store_url, item_name, item_url,
      price, item_image_url, item_type: item_type || 'product', notes,
    });
    return success(res, item, 'Registry item created.', 201);
  } catch (err) {
    console.error('create registry error:', err);
    error(res, 'Failed to create registry item.', 500);
  }
};

/**
 * PUT /api/registry/:id
 */
const update = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const item = await RegistryItem.findOne({ where: { id: req.params.id, couple_id: coupleId } });
    if (!item) return error(res, 'Registry item not found.', 404);

    const { store_name, store_url, item_name, item_url, price, item_image_url, item_type, notes } = req.body;
    await item.update({
      store_name: store_name ?? item.store_name,
      store_url: store_url ?? item.store_url,
      item_name: item_name ?? item.item_name,
      item_url: item_url ?? item.item_url,
      price: price ?? item.price,
      item_image_url: item_image_url ?? item.item_image_url,
      item_type: item_type ?? item.item_type,
      notes: notes ?? item.notes,
    });
    return success(res, item, 'Registry item updated.');
  } catch (err) {
    console.error('update registry error:', err);
    error(res, 'Failed to update registry item.', 500);
  }
};

/**
 * DELETE /api/registry/:id
 */
const deleteItem = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const item = await RegistryItem.findOne({ where: { id: req.params.id, couple_id: coupleId } });
    if (!item) return error(res, 'Registry item not found.', 404);
    await item.destroy();
    return success(res, null, 'Registry item deleted.');
  } catch (err) {
    console.error('deleteItem registry error:', err);
    error(res, 'Failed to delete registry item.', 500);
  }
};

/**
 * PATCH /api/registry/:id/mark-purchased
 */
const markPurchased = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const item = await RegistryItem.findOne({ where: { id: req.params.id, couple_id: coupleId } });
    if (!item) return error(res, 'Registry item not found.', 404);
    await item.update({ is_purchased: !item.is_purchased });
    return success(res, { is_purchased: item.is_purchased }, `Item marked as ${item.is_purchased ? 'purchased' : 'available'}.`);
  } catch (err) {
    console.error('markPurchased error:', err);
    error(res, 'Failed to update purchase status.', 500);
  }
};

module.exports = { getAll, create, update, deleteItem, remove: deleteItem, markPurchased };

