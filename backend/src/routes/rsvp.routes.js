const express = require('express');
const router = express.Router();
const rsvpController = require('../controllers/rsvp.controller');
const { protect } = require('../middlewares/auth');

// Public routes (guest RSVP via token - no login required)
router.get('/form/:token', rsvpController.getPublicRsvpForm);
router.post('/submit/:token', rsvpController.submitRsvp);
router.get('/quick/:token/:eventId/:response', rsvpController.quickRsvp);

// Protected routes (couple dashboard)
router.use(protect);
router.get('/responses', rsvpController.getResponses);
router.get('/stats', rsvpController.getStats);
router.get('/questions', rsvpController.getQuestions);
router.post('/questions', rsvpController.createQuestion);
router.put('/questions/:id', rsvpController.updateQuestion);
router.delete('/questions/:id', rsvpController.deleteQuestion);
router.post('/send-invites', rsvpController.sendInvites);
router.post('/send-logistics', rsvpController.sendLogistics);

module.exports = router;


