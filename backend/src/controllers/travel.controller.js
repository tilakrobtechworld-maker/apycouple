'use strict';

const { TravelInfo } = require('../models');
const { success, error } = require('../utils/apiResponse');

/**
 * GET /api/travel
 */
const getAll = async (req, res) => {
  try {
    let coupleId = req.query.couple_id;
    if (!coupleId && req.user) coupleId = req.user.coupleProfile?.id;
    if (!coupleId) return error(res, 'couple_id is required.', 400);

    const items = await TravelInfo.findAll({
      where: { couple_id: coupleId },
      order: [['sort_order', 'ASC'], ['created_at', 'ASC']],
    });
    return success(res, items, 'Travel info retrieved.');
  } catch (err) {
    console.error('getAll travel error:', err);
    error(res, 'Failed to retrieve travel info.', 500);
  }
};

/**
 * POST /api/travel
 */
const create = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const { title, description, hotel_name, hotel_url, discount_code, booking_link, maps_link, category, sort_order } = req.body;
    if (!title) return error(res, 'title is required.', 400);

    const item = await TravelInfo.create({
      couple_id: coupleId, title, description, hotel_name, hotel_url,
      discount_code, booking_link, maps_link,
      category: category || 'hotel',
      sort_order: sort_order || 0,
    });
    return success(res, item, 'Travel info created.', 201);
  } catch (err) {
    console.error('create travel error:', err);
    error(res, 'Failed to create travel info.', 500);
  }
};

/**
 * PUT /api/travel/:id
 */
const update = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const item = await TravelInfo.findOne({ where: { id: req.params.id, couple_id: coupleId } });
    if (!item) return error(res, 'Travel info not found.', 404);

    const { title, description, hotel_name, hotel_url, discount_code, booking_link, maps_link, category, sort_order } = req.body;
    await item.update({
      title: title ?? item.title,
      description: description ?? item.description,
      hotel_name: hotel_name ?? item.hotel_name,
      hotel_url: hotel_url ?? item.hotel_url,
      discount_code: discount_code ?? item.discount_code,
      booking_link: booking_link ?? item.booking_link,
      maps_link: maps_link ?? item.maps_link,
      category: category ?? item.category,
      sort_order: sort_order ?? item.sort_order,
    });
    return success(res, item, 'Travel info updated.');
  } catch (err) {
    console.error('update travel error:', err);
    error(res, 'Failed to update travel info.', 500);
  }
};

/**
 * DELETE /api/travel/:id
 */
const deleteTravel = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const item = await TravelInfo.findOne({ where: { id: req.params.id, couple_id: coupleId } });
    if (!item) return error(res, 'Travel info not found.', 404);
    await item.destroy();
    return success(res, null, 'Travel info deleted.');
  } catch (err) {
    console.error('deleteTravel error:', err);
    error(res, 'Failed to delete travel info.', 500);
  }
};

/**
 * POST /api/travel/reorder
 * Update sort_order for multiple items at once.
 * Body: { items: [{ id, sort_order }] }
 */
const reorder = async (req, res) => {
  try {
    const coupleId = req.user.coupleProfile.id;
    const { items } = req.body;
    if (!items || !Array.isArray(items)) return error(res, 'items array is required.', 400);

    await Promise.all(
      items.map(({ id, sort_order }) =>
        TravelInfo.update({ sort_order }, { where: { id, couple_id: coupleId } })
      )
    );
    return success(res, null, 'Travel info reordered.');
  } catch (err) {
    console.error('reorder travel error:', err);
    error(res, 'Failed to reorder travel info.', 500);
  }
};

module.exports = { getAll, create, update, deleteTravel, remove: deleteTravel, reorder };

