'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { parseJsonField } = require('../utils/jsonField');

const CoupleProfile = sequelize.define(
  'CoupleProfile',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    bride_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    groom_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    couple_display_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    wedding_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    custom_slug: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },
    custom_domain: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    cover_photo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    wedding_hashtag: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    website_published: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    theme_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'themes',
        key: 'id',
      },
    },
    theme_config: {
      // JSON: stores color overrides over the base theme
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      get: parseJsonField('theme_config'),
    },
    sections_order: {
      // JSON array of section names e.g. ['hero','story','events','registry','travel']
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: ['hero', 'story', 'events', 'registry', 'travel', 'gallery', 'guestbook'],
      get: parseJsonField('sections_order'),
    },
    about_story: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'couple_profiles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = CoupleProfile;
