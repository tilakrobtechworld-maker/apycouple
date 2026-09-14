'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { parseJsonField } = require('../utils/jsonField');

const WeddingCard = sequelize.define(
  'WeddingCard',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    couple_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'couple_profiles',
        key: 'id',
      },
    },
    template_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'card_templates',
        key: 'id',
      },
    },
    custom_slug: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
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
    elements: {
      // JSON array of card elements: { id, type, x, y, width, height, rotation, zIndex, content, style }
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      get: parseJsonField('elements'),
    },
    is_published: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: 'wedding_cards',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = WeddingCard;
