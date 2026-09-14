const express = require('express');
const router = express.Router();
const guestbookController = require('../controllers/guestbook.controller');
const { protect } = require('../middlewares/auth');

// Protected couple routes - registered before the public "/:coupleSlug"
// catch-all below, which would otherwise shadow paths like "/pending" since
// Express matches routes in registration order regardless of specificity.
router.get('/', protect, guestbookController.getAll);
router.get('/pending', protect, guestbookController.getPending);
router.put('/:id/approve', protect, guestbookController.approve);
router.delete('/:id', protect, guestbookController.remove);

// Public: anyone can submit or view a couple's guestbook by slug
router.post('/:coupleSlug', guestbookController.create);
router.get('/:coupleSlug', guestbookController.getApproved);

module.exports = router;

