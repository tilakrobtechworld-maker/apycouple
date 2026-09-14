const express = require('express');
const router = express.Router();
const guestController = require('../controllers/guest.controller');
const { protect } = require('../middlewares/auth');
const { uploadCSV } = require('../middlewares/upload');

router.use(protect);

router.get('/', guestController.getAll);
router.post('/', guestController.create);
router.get('/export', guestController.exportCSV);
router.post('/import', uploadCSV, guestController.importCSV);
router.get('/parties', guestController.getParties);
router.post('/parties', guestController.createParty);
router.put('/parties/:partyId', guestController.updateParty);
router.delete('/parties/:partyId', guestController.deleteParty);
router.get('/:id', guestController.getById);
router.put('/:id', guestController.update);
router.delete('/:id', guestController.deleteGuest);
router.post('/:id/events', guestController.assignToEvents);
router.get('/:id/events', guestController.getGuestEvents);
router.delete('/:id/events/:eventId', guestController.removeFromEvent);

module.exports = router;
