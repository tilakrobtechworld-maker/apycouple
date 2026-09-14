'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const MediaGallery = sequelize.define(
  'MediaGallery',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    couple_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'couple_profiles',
        key: 'id',
      },
    },
    uploader_guest_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'guests',
        key: 'id',
      },
    },
    uploader_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    media_url: {
      type: DataTypes.STRING(1000),
      allowNull: false,
    },
    thumbnail_url: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    cloudinary_id: {
      type: DataTypes.STRING(300),
      allowNull: true,
    },
    media_type: {
      type: DataTypes.ENUM('photo', 'video'),
      allowNull: false,
      defaultValue: 'photo',
    },
    caption: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    is_approved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    uploaded_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'media_gallery',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = MediaGallery;
