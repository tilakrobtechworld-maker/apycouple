const express = require('express');
const router = express.Router();
const travelController = require('../controllers/travel.controller');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.get('/', travelController.getAll);
router.post('/', travelController.create);
router.put('/reorder', travelController.reorder);
router.put('/:id', travelController.update);
router.delete('/:id', travelController.remove);

module.exports = router;

