const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.get('/', notificationController.getAll);
router.post('/', notificationController.create);
router.post('/:id/send', notificationController.send);
router.delete('/:id', notificationController.remove);

module.exports = router;

