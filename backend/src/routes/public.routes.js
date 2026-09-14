const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');

// All public routes - no auth required
router.get('/website/:slug', publicController.getWebsite);
router.get('/website/:slug/gallery', publicController.getGallery);
router.get('/website/:slug/guestbook', publicController.getGuestbook);
router.get('/website/:slug/registry', publicController.getRegistry);
router.get('/website/:slug/travel', publicController.getTravel);
router.get('/card/:slug', publicController.getCard);

module.exports = router;

