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
    body { margin:0; padding:0; font-family: 'Georgia', serif; background:#FFFAF0; color:#2C2C2C; }
    .container { max-width:600px; margin:0 auto; background:#fff; border:1px solid #e0d5c0; }
    .header { background:${primaryColor}; color:#fff; padding:40px 30px; text-align:center; }
    .header h1 { margin:0; font-size:28px; letter-spacing:2px; }
    .header p { margin:8px 0 0; font-size:14px; opacity:0.85; }
    .body { padding:40px 30px; }
    .body p { line-height:1.7; font-size:15px; }
    .btn { display:inline-block; background:${primaryColor}; color:#fff; padding:14px 32px; text-decoration:none; border-radius:4px; font-size:15px; margin:20px 0; }
    .footer { background:#f5f0e8; padding:20px 30px; text-align:center; font-size:12px; color:#888; }
    .divider { border:none; border-top:1px solid #e0d5c0; margin:24px 0; }
  </style>
</head>
<body>
  <div class="container">
    ${content}
    <div class="footer">
      <p>This email was sent by <strong>${coupleDisplayName}</strong> via AppyCouple.</p>
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
 */
const sendInvitation = async (guest, couple, rsvpLink) => {
  if (!process.env.SMTP_USER) {
    console.warn('⚠️  SMTP not configured. Skipping invitation email.');
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

  const content = `
    <div class="header">
      <h1>You're Invited!</h1>
      <p>${coupleName} request the pleasure of your company</p>
    </div>
    <div class="body">
      <p>Dear ${guestName},</p>
      <p>
        We are delighted to invite you to celebrate our wedding on
        <strong>${weddingDate}</strong>.
      </p>
      <p>
        Please click the button below to view full event details and RSVP.
        We look forward to sharing this special day with you!
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
    subject: `You're invited to ${coupleName}'s Wedding! 💍`,
    html: wrapHtmlTemplate(content, coupleName, primaryColor),
  });

  console.log(`✉️  Invitation sent to ${guest.email}`);
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

  const content = `
    <div class="header">
      <h1>Save the Date</h1>
      <p>${coupleName}</p>
    </div>
    <div class="body">
      <p>Dear ${guestName},</p>
      <p>
        We're getting married! Please save the date:
      </p>
      <div style="text-align:center; background:#f5f0e8; padding:30px; margin:20px 0; border-radius:4px;">
        <h2 style="color:${primaryColor}; margin:0; font-size:24px;">${coupleName}</h2>
        <p style="font-size:18px; margin:10px 0;">${weddingDate}</p>
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
    : 'AppyCouple';

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
