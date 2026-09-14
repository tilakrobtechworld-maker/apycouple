'use strict';

const sequelize = require('../config/database');

// ─── Import Models ────────────────────────────────────────────────────────────
const User = require('./User');
const CoupleProfile = require('./CoupleProfile');
const Theme = require('./Theme');
const Event = require('./Event');
const GuestParty = require('./GuestParty');
const Guest = require('./Guest');
const EventGuestAccess = require('./EventGuestAccess');
const RsvpQuestion = require('./RsvpQuestion');
const RsvpSubmission = require('./RsvpSubmission');
const MediaGallery = require('./MediaGallery');
const GuestbookEntry = require('./GuestbookEntry');
const RegistryItem = require('./RegistryItem');
const TravelInfo = require('./TravelInfo');
const Notification = require('./Notification');
const CardTemplate = require('./CardTemplate');
const WeddingCard = require('./WeddingCard');

// ─── Associations ─────────────────────────────────────────────────────────────

// User <-> CoupleProfile (1:1)
User.hasOne(CoupleProfile, { foreignKey: 'user_id', as: 'coupleProfile', onDelete: 'CASCADE' });
CoupleProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// CoupleProfile <-> Theme (N:1)
CoupleProfile.belongsTo(Theme, { foreignKey: 'theme_id', as: 'theme' });
Theme.hasMany(CoupleProfile, { foreignKey: 'theme_id', as: 'coupleProfiles' });

// CoupleProfile <-> Event (1:N)
CoupleProfile.hasMany(Event, { foreignKey: 'couple_id', as: 'events', onDelete: 'CASCADE' });
Event.belongsTo(CoupleProfile, { foreignKey: 'couple_id', as: 'couple' });

// CoupleProfile <-> GuestParty (1:N)
CoupleProfile.hasMany(GuestParty, { foreignKey: 'couple_id', as: 'guestParties', onDelete: 'CASCADE' });
GuestParty.belongsTo(CoupleProfile, { foreignKey: 'couple_id', as: 'couple' });

// GuestParty <-> Guest (1:N)
GuestParty.hasMany(Guest, { foreignKey: 'party_id', as: 'guests' });
Guest.belongsTo(GuestParty, { foreignKey: 'party_id', as: 'party' });

// CoupleProfile <-> Guest (1:N)
CoupleProfile.hasMany(Guest, { foreignKey: 'couple_id', as: 'guests', onDelete: 'CASCADE' });
Guest.belongsTo(CoupleProfile, { foreignKey: 'couple_id', as: 'couple' });

// Event <-> Guest through EventGuestAccess (N:N)
Event.belongsToMany(Guest, {
  through: EventGuestAccess,
  foreignKey: 'event_id',
  otherKey: 'guest_id',
  as: 'guests',
});
Guest.belongsToMany(Event, {
  through: EventGuestAccess,
  foreignKey: 'guest_id',
  otherKey: 'event_id',
  as: 'events',
});

// EventGuestAccess direct associations
EventGuestAccess.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
EventGuestAccess.belongsTo(Guest, { foreignKey: 'guest_id', as: 'guest' });
Event.hasMany(EventGuestAccess, { foreignKey: 'event_id', as: 'guestAccess' });
Guest.hasMany(EventGuestAccess, { foreignKey: 'guest_id', as: 'eventAccess' });

// CoupleProfile <-> RsvpQuestion (1:N)
CoupleProfile.hasMany(RsvpQuestion, { foreignKey: 'couple_id', as: 'rsvpQuestions', onDelete: 'CASCADE' });
RsvpQuestion.belongsTo(CoupleProfile, { foreignKey: 'couple_id', as: 'couple' });

// Event <-> RsvpQuestion (1:N, nullable)
Event.hasMany(RsvpQuestion, { foreignKey: 'event_id', as: 'rsvpQuestions' });
RsvpQuestion.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });

// CoupleProfile <-> RsvpSubmission (1:N)
CoupleProfile.hasMany(RsvpSubmission, { foreignKey: 'couple_id', as: 'rsvpSubmissions', onDelete: 'CASCADE' });
RsvpSubmission.belongsTo(CoupleProfile, { foreignKey: 'couple_id', as: 'couple' });

// Guest <-> RsvpSubmission (1:N)
Guest.hasMany(RsvpSubmission, { foreignKey: 'guest_id', as: 'rsvpSubmissions', onDelete: 'CASCADE' });
RsvpSubmission.belongsTo(Guest, { foreignKey: 'guest_id', as: 'guest' });

// Event <-> RsvpSubmission (1:N)
Event.hasMany(RsvpSubmission, { foreignKey: 'event_id', as: 'rsvpSubmissions' });
RsvpSubmission.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });

// CoupleProfile <-> MediaGallery (1:N)
CoupleProfile.hasMany(MediaGallery, { foreignKey: 'couple_id', as: 'mediaGallery', onDelete: 'CASCADE' });
MediaGallery.belongsTo(CoupleProfile, { foreignKey: 'couple_id', as: 'couple' });

// Guest <-> MediaGallery (uploader, nullable 1:N)
Guest.hasMany(MediaGallery, { foreignKey: 'uploader_guest_id', as: 'uploadedMedia' });
MediaGallery.belongsTo(Guest, { foreignKey: 'uploader_guest_id', as: 'uploaderGuest' });

// CoupleProfile <-> GuestbookEntry (1:N)
CoupleProfile.hasMany(GuestbookEntry, { foreignKey: 'couple_id', as: 'guestbookEntries', onDelete: 'CASCADE' });
GuestbookEntry.belongsTo(CoupleProfile, { foreignKey: 'couple_id', as: 'couple' });

// Guest <-> GuestbookEntry (nullable 1:N)
Guest.hasMany(GuestbookEntry, { foreignKey: 'guest_id', as: 'guestbookEntries' });
GuestbookEntry.belongsTo(Guest, { foreignKey: 'guest_id', as: 'guest' });

// CoupleProfile <-> RegistryItem (1:N)
CoupleProfile.hasMany(RegistryItem, { foreignKey: 'couple_id', as: 'registryItems', onDelete: 'CASCADE' });
RegistryItem.belongsTo(CoupleProfile, { foreignKey: 'couple_id', as: 'couple' });

// CoupleProfile <-> TravelInfo (1:N)
CoupleProfile.hasMany(TravelInfo, { foreignKey: 'couple_id', as: 'travelInfos', onDelete: 'CASCADE' });
TravelInfo.belongsTo(CoupleProfile, { foreignKey: 'couple_id', as: 'couple' });

// CoupleProfile <-> Notification (1:N)
CoupleProfile.hasMany(Notification, { foreignKey: 'couple_id', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(CoupleProfile, { foreignKey: 'couple_id', as: 'couple' });

// Event <-> Notification (nullable 1:N)
Event.hasMany(Notification, { foreignKey: 'target_event_id', as: 'notifications' });
Notification.belongsTo(Event, { foreignKey: 'target_event_id', as: 'targetEvent' });

// CoupleProfile <-> WeddingCard (1:1)
CoupleProfile.hasOne(WeddingCard, { foreignKey: 'couple_id', as: 'weddingCard', onDelete: 'CASCADE' });
WeddingCard.belongsTo(CoupleProfile, { foreignKey: 'couple_id', as: 'couple' });

// CardTemplate <-> WeddingCard (1:N)
CardTemplate.hasMany(WeddingCard, { foreignKey: 'template_id', as: 'weddingCards' });
WeddingCard.belongsTo(CardTemplate, { foreignKey: 'template_id', as: 'template' });

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  sequelize,
  User,
  CoupleProfile,
  Theme,
  Event,
  GuestParty,
  Guest,
  EventGuestAccess,
  RsvpQuestion,
  RsvpSubmission,
  MediaGallery,
  GuestbookEntry,
  RegistryItem,
  TravelInfo,
  Notification,
  CardTemplate,
  WeddingCard,
};
