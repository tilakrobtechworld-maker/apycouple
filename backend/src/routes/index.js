const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const coupleRoutes = require('./couple.routes');
const guestRoutes = require('./guest.routes');
const eventRoutes = require('./event.routes');
const rsvpRoutes = require('./rsvp.routes');
const mediaRoutes = require('./media.routes');
const guestbookRoutes = require('./guestbook.routes');
const registryRoutes = require('./registry.routes');
const travelRoutes = require('./travel.routes');
const notificationRoutes = require('./notification.routes');
const themeRoutes = require('./theme.routes');
const adminRoutes = require('./admin.routes');
const publicRoutes = require('./public.routes');
const cardTemplateRoutes = require('./cardTemplate.routes');
const cardRoutes = require('./card.routes');

router.use('/auth', authRoutes);
router.use('/couple', coupleRoutes);
router.use('/guests', guestRoutes);
router.use('/events', eventRoutes);
router.use('/rsvp', rsvpRoutes);
router.use('/media', mediaRoutes);
router.use('/guestbook', guestbookRoutes);
router.use('/registry', registryRoutes);
router.use('/travel', travelRoutes);
router.use('/notifications', notificationRoutes);
router.use('/themes', themeRoutes);
router.use('/admin', adminRoutes);
router.use('/public', publicRoutes);
router.use('/card-templates', cardTemplateRoutes);
router.use('/cards', cardRoutes);

module.exports = router;

