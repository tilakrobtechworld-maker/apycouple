'use strict';

let twilioClient = null;

// Lazily initialize Twilio only if credentials are present
const getTwilioClient = () => {
  if (twilioClient) return twilioClient;
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    return twilioClient;
  }
  return null;
};

/**
 * Send an SMS wedding invitation with an RSVP link.
 * @param {string} phone - Recipient phone number (E.164 format preferred)
 * @param {string} coupleName - Display name of the couple
 * @param {string} rsvpLink - Full RSVP URL
 */
const sendInvitationSms = async (phone, coupleName, rsvpLink) => {
  const client = getTwilioClient();
  if (!client) {
    console.warn('⚠️  Twilio not configured. Skipping SMS invitation.');
    return;
  }

  const message = `You're invited to ${coupleName}'s wedding! 💍 RSVP here: ${rsvpLink}`;

  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to: phone,
    });
    console.log(`📱 SMS sent to ${phone} (SID: ${result.sid})`);
    return result;
  } catch (err) {
    console.error(`❌ SMS failed to ${phone}:`, err.message);
    throw err;
  }
};

/**
 * Send a generic SMS alert to a phone number.
 * @param {string} phone - Recipient phone number
 * @param {string} message - SMS body text
 */
const sendAlert = async (phone, message) => {
  const client = getTwilioClient();
  if (!client) {
    console.warn('⚠️  Twilio not configured. Skipping SMS alert.');
    return;
  }

  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to: phone,
    });
    console.log(`📱 Alert SMS sent to ${phone} (SID: ${result.sid})`);
    return result;
  } catch (err) {
    console.error(`❌ SMS alert failed to ${phone}:`, err.message);
    throw err;
  }
};

module.exports = { sendInvitationSms, sendAlert };
