'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const GuestbookEntry = sequelize.define(
  'GuestbookEntry',
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
    guest_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'guests',
        key: 'id',
      },
    },
    author_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    message_text: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    media_url: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    entry_type: {
      type: DataTypes.ENUM('text', 'audio', 'video'),
      allowNull: false,
      defaultValue: 'text',
    },
    is_approved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: 'guestbook_entries',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = GuestbookEntry;
