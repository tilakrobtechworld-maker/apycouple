const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/media.controller');
const { protect } = require('../middlewares/auth');
const { uploadMedia } = require('../middlewares/upload');

// Public: guests can upload photos without account (using couple slug)
router.post('/upload/:coupleSlug', uploadMedia, mediaController.guestUpload);
router.get('/gallery/:coupleSlug', mediaController.getPublicGallery);

// Protected couple routes
router.use(protect);
router.post('/upload', uploadMedia, mediaController.upload);
router.get('/', mediaController.getAll);
router.get('/pending', mediaController.getPending);
router.put('/:id/approve', mediaController.approve);
router.put('/:id/feature', mediaController.toggleFeatured);
router.delete('/:id', mediaController.remove);
router.post('/bulk-approve', mediaController.bulkApprove);

module.exports = router;

