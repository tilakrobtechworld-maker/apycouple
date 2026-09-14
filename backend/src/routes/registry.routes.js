const express = require('express');
const router = express.Router();
const registryController = require('../controllers/registry.controller');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.get('/', registryController.getAll);
router.post('/', registryController.create);
router.put('/:id', registryController.update);
router.delete('/:id', registryController.remove);
router.put('/:id/purchased', registryController.markPurchased);

module.exports = router;

