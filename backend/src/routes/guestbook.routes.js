const express = require('express');
const router = express.Router();
const guestbookController = require('../controllers/guestbook.controller');
const { protect } = require('../middlewares/auth');

// Public: anyone can submit a guestbook entry
router.post('/:coupleSlug', guestbookController.create);
router.get('/:coupleSlug', guestbookController.getApproved);

// Protected couple routes
router.use(protect);
router.get('/', guestbookController.getAll);
router.get('/pending', guestbookController.getPending);
router.put('/:id/approve', guestbookController.approve);
router.delete('/:id', guestbookController.remove);

module.exports = router;

