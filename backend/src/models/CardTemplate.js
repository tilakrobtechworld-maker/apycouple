'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { parseJsonField } = require('../utils/jsonField');

const CardTemplate = sequelize.define(
  'CardTemplate',
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
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    preview_image_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    canvas_width: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1080,
    },
    canvas_height: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1350,
    },
    background_color: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '#fffaf0',
    },
    background_image_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    default_elements: {
      // JSON array of card elements: { id, type, x, y, width, height, rotation, zIndex, content, style }
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      get: parseJsonField('default_elements'),
    },
    // Optional full custom design for this card's face. When set, this
    // replaces the drag-and-drop `default_elements` rendering entirely on
    // the couple's public/exported card - full design freedom instead of
    // the element system. custom_html supports {{bride_name}} style
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
    tableName: 'card_templates',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = CardTemplate;
