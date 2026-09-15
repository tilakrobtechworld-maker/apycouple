const express = require('express');
const router = express.Router();
const sceneTemplateController = require('../controllers/sceneTemplate.controller');
const { protect } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/adminAuth');
const { uploadPhoto } = require('../middlewares/upload');

// Public
router.get('/', sceneTemplateController.getAll);

// Admin only
router.post('/upload-image', protect, requireAdmin, uploadPhoto, sceneTemplateController.uploadImage);
router.post('/', protect, requireAdmin, sceneTemplateController.create);
router.put('/:id', protect, requireAdmin, sceneTemplateController.update);
router.delete('/:id', protect, requireAdmin, sceneTemplateController.deleteSceneTemplate);
router.put('/:id/toggle', protect, requireAdmin, sceneTemplateController.toggleActive);

module.exports = router;
