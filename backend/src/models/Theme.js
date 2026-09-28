'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { parseJsonField } = require('../utils/jsonField');

const Theme = sequelize.define(
  'Theme',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    preview_image_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    color_palette: {
      // JSON: { primary, secondary, accent, background, text }
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        primary: '#B8860B',
        secondary: '#F5F5DC',
        accent: '#8B4513',
        background: '#FFFAF0',
        text: '#2C2C2C',
      },
      get: parseJsonField('color_palette'),
    },
    font_pair: {
      // JSON: { heading, body }
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        heading: 'Playfair Display',
        body: 'Lato',
      },
      get: parseJsonField('font_pair'),
    },
    // Which built-in website layout renders this theme (see
    // frontend/src/pages/PublicWebsite/templates.js). 'classic' is the original.
    layout: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'classic',
    },
    model_3d_url: {
      // Optional .glb/.gltf model shown rotating in the public website's hero.
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    // Optional advanced styling/behavior layered on top of the site's fixed
    // sections (hero, RSVP, gallery, etc. stay as-is). custom_css is injected
    // as a <style> tag, custom_js runs once the page has mounted, and
    // custom_html renders as its own section supporting {{bride_name}} style
    // placeholders for couple data.
    custom_html: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    custom_css: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    custom_js: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_premium: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: 'themes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Theme;
