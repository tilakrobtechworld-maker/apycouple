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

module.exports = { ensureThemeLayoutColumn, seedTemplates, TEMPLATES };
