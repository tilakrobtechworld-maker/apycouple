const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.get('/', eventController.getAll);
router.post('/', eventController.create);
router.get('/:id', eventController.getById);
router.put('/:id', eventController.update);
router.delete('/:id', eventController.deleteEvent);
router.get('/:id/guests', eventController.getEventGuests);
router.post('/:id/guests/bulk', eventController.bulkAssignGuests);
router.delete('/:id/guests/:guestId', eventController.removeGuestFromEvent);

module.exports = router;
