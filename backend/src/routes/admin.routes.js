const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const themeController = require('../controllers/theme.controller');
const cardTemplateController = require('../controllers/cardTemplate.controller');
const sceneTemplateController = require('../controllers/sceneTemplate.controller');
const { protect } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/adminAuth');

router.use(protect, requireAdmin);

router.get('/stats', adminController.getStats);
router.get('/couples', adminController.getCouples);
router.get('/couples/:id', adminController.getCoupleDetail);
router.put('/couples/:id/suspend', adminController.suspendCouple);
router.put('/couples/:id/activate', adminController.activateCouple);
router.delete('/couples/:id', adminController.deleteCouple);
router.put('/couples/:id/subscription', adminController.updateSubscription);
router.get('/media/pending', adminController.getMediaQueue);
router.put('/media/:id/approve', adminController.approveMedia);
router.delete('/media/:id', adminController.rejectMedia);
router.post('/broadcast', adminController.broadcastNotification);
router.get('/themes', themeController.getAllAdmin);
router.get('/card-templates', cardTemplateController.getAllAdmin);
router.get('/scene-templates', sceneTemplateController.getAllAdmin);

module.exports = router;

