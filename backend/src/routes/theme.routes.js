const express = require('express');
const router = express.Router();
const themeController = require('../controllers/theme.controller');
const { protect } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/adminAuth');
const { uploadPhoto, upload3DModel } = require('../middlewares/upload');

// Public: couples browse themes
router.get('/', themeController.getAll);

// Admin only
router.post('/generate-ai', protect, requireAdmin, themeController.generateAI);
router.post('/upload-image', protect, requireAdmin, uploadPhoto, themeController.uploadImage);
router.post('/upload-model', protect, requireAdmin, upload3DModel, themeController.uploadModel);
router.post('/', protect, requireAdmin, themeController.create);
router.put('/:id', protect, requireAdmin, themeController.update);
router.delete('/:id', protect, requireAdmin, themeController.deleteTheme);
router.put('/:id/toggle', protect, requireAdmin, themeController.toggleActive);

module.exports = router;

