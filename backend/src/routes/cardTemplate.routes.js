const express = require('express');
const router = express.Router();
const cardTemplateController = require('../controllers/cardTemplate.controller');
const { protect } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/adminAuth');
const { uploadPhoto } = require('../middlewares/upload');

// Public: couples browse card templates
router.get('/', cardTemplateController.getAll);

// Admin only
router.post('/upload-image', protect, requireAdmin, uploadPhoto, cardTemplateController.uploadImage);
router.post('/', protect, requireAdmin, cardTemplateController.create);
router.put('/:id', protect, requireAdmin, cardTemplateController.update);
router.delete('/:id', protect, requireAdmin, cardTemplateController.deleteCardTemplate);
router.put('/:id/toggle', protect, requireAdmin, cardTemplateController.toggleActive);

module.exports = router;
