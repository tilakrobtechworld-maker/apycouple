const express = require('express');
const router = express.Router();
const cardController = require('../controllers/card.controller');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.get('/me', cardController.getMine);
router.put('/me', cardController.updateMine);
router.put('/me/publish', cardController.publish);
router.put('/me/unpublish', cardController.unpublish);

module.exports = router;
