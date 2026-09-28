'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Website templates: each row is a normal Theme (so the existing theme picker,
// admin CRUD and public API just work) with a `layout` naming the built-in
// design in frontend/src/pages/PublicWebsite/templates.js.
const TEMPLATES = [
  {
    layout: 'elegant', name: 'Elegant Luxury', sort_order: 10,
    description: 'Framed full-photo hero, gold hairlines and refined serif type.',
    palette: { primary: '#B08D57', secondary: '#D9C7A3', accent: '#8C6D3F', background: '#FBF8F3', text: '#2B2B2B' },
    fonts: { heading: 'Cormorant Garamond', body: 'Lato' },
  },
  {
    layout: 'minimal', name: 'Minimal Modern', sort_order: 11,
    description: 'Split hero, generous whitespace and light geometric sans-serif.',
    palette: { primary: '#111111', secondary: '#E5E5E5', accent: '#6B7280', background: '#FFFFFF', text: '#111111' },
    fonts: { heading: 'Josefin Sans', body: 'Inter' },
  },
  {
    layout: 'indian', name: 'Traditional Indian', sort_order: 12,
    description: 'Arched portrait, marigold petals and rich maroon-and-gold ornament.',
    palette: { primary: '#7B1E1E', secondary: '#D4A017', accent: '#E8730C', background: '#FFF6E5', text: '#4A1414' },
    fonts: { heading: 'Cinzel', body: 'EB Garamond' },
  },
  {
    layout: 'floral', name: 'Floral Romantic', sort_order: 13,
    description: 'Round portrait, script headings, soft blush cards and drifting petals.',
    palette: { primary: '#D6708A', secondary: '#F8D7DF', accent: '#8FAE8B', background: '#FFF7F8', text: '#5A3A44' },
    fonts: { heading: 'Great Vibes', body: 'Nunito' },
  },
  {
    layout: 'royal', name: 'Royal Premium', sort_order: 14,
    description: 'Deep navy with double gold borders, crest hero and a centered timeline.',
    palette: { primary: '#D4AF37', secondary: '#B8962E', accent: '#F1D77A', background: '#0B1B3A', text: '#F5EFD9' },
    fonts: { heading: 'Cinzel', body: 'EB Garamond' },
  },
  {
    layout: 'gates', name: 'Royal Gates 3D', sort_order: 9,
    description: 'Scroll-driven 3D intro: old-world iron-strapped wooden gates in a stone arch swing open and you glide through to the wedding.',
    palette: { primary: '#E6B85C', secondary: '#8C1C2B', accent: '#F6E3B0', background: '#0B1020', text: '#F3ECDD' },
    fonts: { heading: 'Cinzel', body: 'Lato' },
  },
  {
    layout: 'rustic', name: 'Rustic Pastel', sort_order: 15,
    description: 'Tilted polaroid hero, warm pastels and scrapbook-style photos.',
    palette: { primary: '#B5835A', secondary: '#E9D8C4', accent: '#8FA58A', background: '#FAF3EA', text: '#4B3A2E' },
    fonts: { heading: 'Dancing Script', body: 'Nunito' },
  },
  {
    layout: 'dark', name: 'Dark Modern', sort_order: 16,
    description: 'Bottom-left oversized names on a dark canvas with neon-rose accents.',
    palette: { primary: '#FF4D6D', secondary: '#2A2A35', accent: '#7C5CFF', background: '#0F0F14', text: '#F4F4F6' },
    fonts: { heading: 'Montserrat', body: 'Inter' },
  },
  {
    layout: 'clean', name: 'Simple Clean', sort_order: 17,
    description: 'Compact centered header, wide photo banner and tidy rounded cards.',
    palette: { primary: '#2F6FED', secondary: '#E8EEFC', accent: '#10B981', background: '#F8FAFC', text: '#1E293B' },
    fonts: { heading: 'Montserrat', body: 'Open Sans' },
  },
];

// Older databases (created before `layout` existed) don't get new columns from
// sync() outside development, so add it explicitly. Safe to run every boot.
const ensureThemeLayoutColumn = async () => {
  const qi = sequelize.getQueryInterface();
  const cols = await qi.describeTable('themes');
  if (!cols.layout) {
    await qi.addColumn('themes', 'layout', {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'classic',
    });
    console.log('✅ Added themes.layout column.');
  }
};

// Create any missing template themes (matched by slug). Existing rows - including
// ones an admin has edited - are never overwritten.
const seedTemplates = async () => {
  const { Theme } = require('../models');
  for (const t of TEMPLATES) {
    const slug = `template-${t.layout}`;
    await Theme.findOrCreate({
      where: { slug },
      defaults: {
        name: t.name,
        slug,
        layout: t.layout,
        description: t.description,
        color_palette: t.palette,
        font_pair: t.fonts,
        is_premium: false,
        is_active: true,
        sort_order: t.sort_order,
      },
    });
  }
};



// ─── Card (invitation) templates ──────────────────────────────────────────────
// Ready-made invitation cards for the Card Creator. Backgrounds/previews are
// static files served from the frontend (frontend/public/card-templates); every
// piece of text is its own editable element with default wording, so couples
// can edit, move, restyle or delete any of it.
// Helper for laying elements out in the source artwork's own pixel space:
// `k` = card width / artwork width, cx/cy are artwork coordinates (centre of the
// text), w/F (box width, font size) are in card pixels.
const cardBuilder = (k, ink, rule) => {
  const els = [];
  let z = 1;
  const text = (id, content, cx, cy, w, F, fontFamily, fontWeight = 400, lineH = 1.45, color = ink) => {
    const h = Math.round(F * lineH);
    els.push({
      id, type: 'text', x: Math.round(cx * k - w / 2), y: Math.round(cy * k - h / 2),
      width: w, height: h, rotation: 0, zIndex: z++, content,
      style: { fontFamily, fontSize: F, color, textAlign: 'center', fontWeight },
    });
  };
  const line = (id, x0, x1, y) => {
    els.push({
      id, type: 'shape', x: Math.round(x0 * k), y: Math.round(y * k), width: Math.round((x1 - x0) * k), height: 2,
      rotation: 0, zIndex: z++, content: '', style: { background: rule, shapeType: 'rectangle', opacity: 1 },
    });
  };
  return { els, text, line };
};

const walimaBlueFloralElements = () => {
  const { els, text, line } = cardBuilder(1080 / 474, '#1b1b1f', '#9aa0ab'); // artwork is 474px wide

  text('bismillah', 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', 237, 51, 560, 52, 'Amiri', 700, 1.7);
  text('caption', 'AND WE CREATED YOU IN PAIRS. QURAN [78:8]', 237, 74.5, 700, 14, 'Lato', 700);
  text('parents', 'MR. & MRS. M.RAMZAN NAVEED', 237, 94.5, 800, 29, 'EB Garamond', 700);
  text('invite', 'CORDIALLY INVITE YOU', 237, 113, 700, 26, 'EB Garamond');
  text('ceremony', 'AT THE WALIMA CEREMONY OF', 237, 128, 800, 26, 'EB Garamond');
  text('relation', 'THEIR BELOVED SON', 237, 142.5, 700, 26, 'EB Garamond');
  text('groom', 'Bilal Naveed', 137, 183, 480, 84, 'Great Vibes', 400, 1.6);
  text('with', 'WITH', 248, 169, 110, 22, 'EB Garamond');
  text('bride', 'Asma Zahid', 348, 181, 430, 84, 'Great Vibes', 400, 1.6);
  text('programme', 'PROGRAMME IN-SHA-ALLAH', 237, 218, 800, 28, 'EB Garamond', 700);
  text('month', 'JANUARY', 237, 239, 400, 32, 'EB Garamond');
  line('rule-tl', 143, 213, 251);
  line('rule-tr', 258, 330, 251);
  text('weekday', 'MONDAY', 180, 262, 170, 32, 'EB Garamond');
  text('day', '24', 236, 262, 100, 84, 'EB Garamond', 400, 1.4);
  text('time', 'AT 1:30 PM', 294, 262, 200, 30, 'EB Garamond');
  line('rule-bl', 143, 213, 273);
  line('rule-br', 258, 330, 273);
  text('year', '2022', 236, 283, 110, 26, 'EB Garamond', 600);
  text('venue', 'VENUE: GRACE MARQUEE, GUJRAT ROAD PHALIA', 237, 302, 950, 27, 'EB Garamond');
  text('contact', 'CONTACT: 0344-842892 | 0344-6233182', 237, 319, 950, 25, 'EB Garamond');
  return els;
};

const springBotanicalElements = () => {
  const { els, text } = cardBuilder(1080 / 437, '#b5905c', '#b5905c'); // artwork is 437px wide
  text('title-1', 'WEDDING INVITATION WITH', 216, 39.5, 700, 30, 'Quicksand', 500);
  text('title-2', 'SPRING FLOWERS', 216, 52.5, 700, 30, 'Quicksand', 500);
  text('bride', 'Isabella', 217.5, 112, 600, 155, 'Dancing Script', 400, 1.5);
  text('and', 'and', 218, 176, 300, 80, 'Dancing Script', 400, 1.5);
  text('groom', 'Michael', 219, 240, 640, 172, 'Dancing Script', 400, 1.5);
  text('date', '27 April 2019', 219, 290.5, 600, 31, 'Quicksand', 500);
  text('list-1', 'Iris, Ranunculus, Lilac, Pulmonaria,', 218.5, 316.5, 700, 30, 'Quicksand', 500);
  text('list-2', 'Tulip, Fritillaria meleagris', 221, 330, 700, 30, 'Quicksand', 500);
  text('list-3', 'Carnation, Bell', 219, 344, 700, 30, 'Quicksand', 500);
  return els;
};

const seedCardTemplates = async () => {
  const { CardTemplate } = require('../models');
  const { toOrigin } = require('./toOrigin');
  const assets = `${toOrigin(process.env.FRONTEND_URL, 'http://localhost:3000').replace(/\/+$/, '')}/card-templates`;

  await CardTemplate.findOrCreate({
    where: { slug: 'walima-blue-floral' },
    defaults: {
      name: 'Walima Blue Floral',
      slug: 'walima-blue-floral',
      description: 'Soft blue hydrangea invitation with an illustrated couple - all wording is editable.',
      preview_image_url: `${assets}/walima-blue-floral-preview.jpg`,
      background_image_url: `${assets}/walima-blue-floral-bg.jpg`,
      background_color: '#eef3fb',
      canvas_width: 1080,
      canvas_height: 1474,
      default_elements: walimaBlueFloralElements(),
      is_premium: false,
      is_active: true,
      sort_order: 20,
    },
  });

  await CardTemplate.findOrCreate({
    where: { slug: 'spring-blue-botanical' },
    defaults: {
      name: 'Spring Blue Botanical',
      slug: 'spring-blue-botanical',
      description: 'Blue engraved spring flowers on warm ivory with gold script - all wording is editable.',
      preview_image_url: `${assets}/spring-blue-botanical-preview.jpg`,
      background_image_url: `${assets}/spring-blue-botanical-bg.jpg`,
      background_color: '#f2edea',
      canvas_width: 1080,
      canvas_height: 1512,
      default_elements: springBotanicalElements(),
      is_premium: false,
      is_active: true,
      sort_order: 21,
    },
  });
};

module.exports = { ensureThemeLayoutColumn, seedTemplates, seedCardTemplates, TEMPLATES, walimaBlueFloralElements, springBotanicalElements };
