'use strict';

const nodemailer = require('nodemailer');

// ─── Transporter ──────────────────────────────────────────────────────────────
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_PORT === '465',
      family: 4, // force IPv4 - some cloud hosts hang on broken IPv6 routes to Gmail
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

// ─── HTML Template Helpers ────────────────────────────────────────────────────
const wrapHtmlTemplate = (content, coupleDisplayName = 'Our Wedding', primaryColor = '#B8860B') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${coupleDisplayName}</title>
  <style>
    body { margin:0; padding:0; font-family: 'Georgia', serif; background:#f0ece3; color:#2C2C2C; }
    .container { max-width:600px; margin:24px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.06); }
    .header { background:${primaryColor}; color:#fff; padding:48px 30px 36px; text-align:center; }
    .header .icon { font-size:32px; margin-bottom:6px; }
    .header h1 { margin:0; font-size:30px; letter-spacing:2px; }
    .header p { margin:10px 0 0; font-size:15px; opacity:0.9; }
    .countdown-wrap { text-align:center; padding:22px 30px 0; }
    .countdown-pill { display:inline-block; background:#fff; border:2px solid ${primaryColor}; border-radius:50px; padding:10px 26px; }
    .countdown-num { font-size:22px; font-weight:bold; color:${primaryColor}; }
    .countdown-label { font-size:12px; color:#888; margin-left:6px; text-transform:uppercase; letter-spacing:0.5px; }
    .body { padding:32px 30px 40px; }
    .body p { line-height:1.7; font-size:15px; }
    .event-card { background:#faf7f2; border:1px solid #ecdfc9; border-radius:12px; padding:22px 24px; margin:22px 0; }
    .event-card table td { padding:5px 0; font-size:14px; vertical-align:top; }
    .btn { display:inline-block; background:${primaryColor}; color:#fff; padding:14px 34px; text-decoration:none; border-radius:6px; font-size:15px; margin:20px 0; font-weight:bold; }
    .btn-outline { display:inline-block; border:1.5px solid ${primaryColor}; color:${primaryColor}; padding:8px 18px; text-decoration:none; border-radius:20px; font-size:13px; }
    .footer { background:#f5f0e8; padding:22px 30px; text-align:center; font-size:12px; color:#888; }
    .divider { border:none; border-top:1px solid #e8ddc9; margin:26px 0; }
  </style>
</head>
<body>
  <div class="container">
    ${content}
    <div class="footer">
      <p>This email was sent by <strong>${coupleDisplayName}</strong> via SaveTheDate.</p>
      <p>If you have any questions, please reply to this email.</p>
    </div>
  </div>
</body>
</html>
`;

// ─── Email Service Functions ──────────────────────────────────────────────────

/**
 * Send a wedding invitation email to a guest.
 * @param {object} guest - Guest model instance
 * @param {object} couple - CoupleProfile model instance
 * @param {string} rsvpLink - Full RSVP URL with token
 * @param {object} [event] - Optional Event model instance. When given, the
 *   invitation is personalized for that specific event (title/venue/time)
 *   instead of the generic wedding date.
 */
const sendInvitation = async (guest, couple, rsvpLink, event = null) => {
  if (!process.env.SMTP_USER) {
    console.warn('⚠️  SMTP not configured. Skipping invitation email.');
    return;
  }

  const primaryColor = couple.theme_config?.primary || '#B8860B';
  const coupleName = couple.couple_display_name || `${couple.bride_name} & ${couple.groom_name}`;
  const guestName = `${guest.first_name}${guest.last_name ? ' ' + guest.last_name : ''}`;
  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const formatTime = (d) => new Date(d).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });

  const eventDate = event?.start_time ? formatDate(event.start_time) : null;
  const eventTime = event?.start_time ? formatTime(event.start_time) : null;
  const weddingDate = couple.wedding_date ? formatDate(couple.wedding_date) : 'Date TBD';

  // Days-to-go countdown, computed as of send time
  const countdownFrom = event?.start_time || couple.wedding_date;
  const daysToGo = countdownFrom
    ? Math.ceil((new Date(countdownFrom) - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  const countdownHtml = daysToGo !== null && daysToGo >= 0
    ? `
      <div class="countdown-wrap">
        <div class="countdown-pill">
          <span class="countdown-num">${daysToGo === 0 ? 'Today' : daysToGo}</span>
          ${daysToGo > 0 ? `<span class="countdown-label">day${daysToGo === 1 ? '' : 's'} to go</span>` : ''}
        </div>
      </div>
    `
    : '';

  const directionsLink = event?.maps_embed_url
    || (event?.venue_name || event?.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event?.venue_name, event?.address].filter(Boolean).join(', '))}`
      : null);

  const introHtml = event
    ? `<p>We are delighted to invite you to celebrate <strong>${event.title}</strong> with us.</p>`
    : `<p>We are delighted to invite you to celebrate our wedding on <strong>${weddingDate}</strong>.</p>`;

  const eventCardHtml = event
    ? `
      <div class="event-card">
        <table role="presentation" width="100%">
          ${eventDate ? `<tr><td width="28">📅</td><td><strong>${eventDate}</strong></td></tr>` : ''}
          ${eventTime ? `<tr><td width="28">🕐</td><td>${eventTime}</td></tr>` : ''}
          ${event.venue_name ? `<tr><td width="28">📍</td><td><strong>${event.venue_name}</strong>${event.address ? `<br/><span style="color:#888;">${event.address}</span>` : ''}</td></tr>` : ''}
          ${event.dress_code ? `<tr><td width="28">👔</td><td>Dress code: <strong>${event.dress_code}</strong></td></tr>` : ''}
        </table>
        ${directionsLink ? `<div style="text-align:center; margin-top:16px;"><a href="${directionsLink}" class="btn-outline">📍 Get Directions</a></div>` : ''}
      </div>
    `
    : '';

  // One-click RSVP buttons (no form to fill) - only possible when we know
  // exactly which single event this invite is for.
  let quickRsvpHtml = '';
  if (event) {
    const apiBase = (process.env.API_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000').replace(/\/+$/, '');
    const quickLink = (r) => `${apiBase}/api/rsvp/quick/${guest.rsvp_token}/${event.id}/${r}`;
    quickRsvpHtml = `
      <p style="text-align:center; font-size:13px; color:#888; margin-top:24px;">Quick response — one click, no form needed:</p>
      <div style="text-align:center; margin:12px 0;">
        <a href="${quickLink('yes')}" style="display:inline-block; background:#22c55e; color:#fff; padding:10px 18px; border-radius:4px; text-decoration:none; font-size:14px; margin:4px; font-weight:bold;">✅ I'll be there</a>
        <a href="${quickLink('maybe')}" style="display:inline-block; background:#9ca3af; color:#fff; padding:10px 18px; border-radius:4px; text-decoration:none; font-size:14px; margin:4px; font-weight:bold;">🤔 Maybe</a>
        <a href="${quickLink('no')}" style="display:inline-block; background:#ef4444; color:#fff; padding:10px 18px; border-radius:4px; text-decoration:none; font-size:14px; margin:4px; font-weight:bold;">❌ Can't make it</a>
      </div>
    `;
  }

  const content = `
    <div class="header">
      <div class="icon">💍</div>
      <h1>You're Invited!</h1>
      <p>${coupleName} request the pleasure of your company</p>
    </div>
    ${countdownHtml}
    <div class="body">
      <p>Dear ${guestName},</p>
      ${introHtml}
      ${eventCardHtml}
      ${quickRsvpHtml}
      <p>
        ${event
          ? 'Want to add a meal choice, song request, or bring a plus-one? View the full invitation:'
          : 'Please click the button below to view full event details and RSVP.'}
      </p>
      <div style="text-align:center;">
        <a href="${rsvpLink}" class="btn">View Invitation & RSVP</a>
      </div>
      <hr class="divider" />
      <p style="font-size:13px; color:#888;">
        Or copy this link: <a href="${rsvpLink}">${rsvpLink}</a>
      </p>
      ${couple.wedding_hashtag ? `<p style="text-align:center; font-size:18px; color:${primaryColor};">${couple.wedding_hashtag}</p>` : ''}
    </div>
  `;

  await getTransporter().sendMail({
    from: `"${coupleName}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: guest.email,
    subject: event
      ? `You're invited to ${event.title} — ${coupleName}'s Wedding! 💍`
      : `You're invited to ${coupleName}'s Wedding! 💍`,
    html: wrapHtmlTemplate(content, coupleName, primaryColor),
  });

  console.log(`✉️  Invitation sent to ${guest.email}${event ? ` (${event.title})` : ''}`);
};

/**
 * Send a save-the-date email.
 * @param {object} guest - Guest model instance
 * @param {object} couple - CoupleProfile model instance
 */
const sendSaveTheDate = async (guest, couple) => {
  if (!process.env.SMTP_USER) {
    console.warn('⚠️  SMTP not configured. Skipping save-the-date email.');
    return;
  }

  const primaryColor = couple.theme_config?.primary || '#B8860B';
  const coupleName = couple.couple_display_name || `${couple.bride_name} & ${couple.groom_name}`;
  const guestName = `${guest.first_name}${guest.last_name ? ' ' + guest.last_name : ''}`;
  const weddingDate = couple.wedding_date
    ? new Date(couple.wedding_date).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : 'Date TBD';

  const daysToGo = couple.wedding_date
    ? Math.ceil((new Date(couple.wedding_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  const countdownHtml = daysToGo !== null && daysToGo >= 0
    ? `
      <div class="countdown-wrap">
        <div class="countdown-pill">
          <span class="countdown-num">${daysToGo === 0 ? 'Today' : daysToGo}</span>
          ${daysToGo > 0 ? `<span class="countdown-label">day${daysToGo === 1 ? '' : 's'} to go</span>` : ''}
        </div>
      </div>
    `
    : '';

  const content = `
    <div class="header">
      <div class="icon">📅</div>
      <h1>Save the Date</h1>
      <p>${coupleName}</p>
    </div>
    ${countdownHtml}
    <div class="body">
      <p>Dear ${guestName},</p>
      <p>
        We're getting married! Please save the date:
      </p>
      <div class="event-card" style="text-align:center;">
        <h2 style="color:${primaryColor}; margin:0; font-size:24px;">${coupleName}</h2>
        <p style="font-size:18px; margin:10px 0 0;">${weddingDate}</p>
      </div>
      <p>A formal invitation will follow. We can't wait to celebrate with you!</p>
      ${couple.wedding_hashtag ? `<p style="text-align:center; font-size:18px; color:${primaryColor};">${couple.wedding_hashtag}</p>` : ''}
    </div>
  `;

  await getTransporter().sendMail({
    from: `"${coupleName}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: guest.email,
    subject: `Save the Date – ${coupleName}'s Wedding 📅`,
    html: wrapHtmlTemplate(content, coupleName, primaryColor),
  });

  console.log(`✉️  Save-the-date sent to ${guest.email}`);
};

/**
 * Send a broadcast email to multiple recipients.
 * @param {string[]} recipients - Array of email addresses
 * @param {string} subject - Email subject
 * @param {string} message - Plain message text (wrapped in template)
 * @param {object} [couple] - Optional couple profile for branding
 */
const sendBroadcast = async (recipients, subject, message, couple = null) => {
  if (!process.env.SMTP_USER) {
    console.warn('⚠️  SMTP not configured. Skipping broadcast email.');
    return { sent: 0, failed: recipients.length };
  }

  const primaryColor = couple?.theme_config?.primary || '#B8860B';
  const coupleName = couple
    ? couple.couple_display_name || `${couple.bride_name} & ${couple.groom_name}`
    : 'SaveTheDate';

  const content = `
    <div class="header">
      <h1>${coupleName}</h1>
    </div>
    <div class="body">
      <p>${message.replace(/\n/g, '</p><p>')}</p>
    </div>
  `;

  const html = wrapHtmlTemplate(content, coupleName, primaryColor);
  const from = `"${coupleName}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`;

  let sent = 0;
  let failed = 0;

  // Send in batches of 10 to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    const promises = batch.map((email) =>
      getTransporter()
        .sendMail({ from, to: email, subject, html })
        .then(() => sent++)
        .catch((err) => {
          console.error(`Failed to send to ${email}:`, err.message);
          failed++;
        })
    );
    await Promise.all(promises);
  }

  console.log(`✉️  Broadcast: ${sent} sent, ${failed} failed.`);
  return { sent, failed };
};

module.exports = { sendInvitation, sendSaveTheDate, sendBroadcast };
