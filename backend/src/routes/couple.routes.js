const express = require('express');
const router = express.Router();
const coupleController = require('../controllers/couple.controller');
const { protect } = require('../middlewares/auth');
const { uploadPhoto } = require('../middlewares/upload');

router.use(protect);

router.get('/profile', coupleController.getProfile);
router.put('/profile', coupleController.updateProfile);
router.put('/theme', coupleController.updateTheme);
router.post('/cover-photo', uploadPhoto, coupleController.updateCoverPhoto);
router.put('/publish', coupleController.publishWebsite);
router.put('/unpublish', coupleController.unpublishWebsite);
router.get('/dashboard-stats', coupleController.getDashboardStats);

module.exports = router;
