'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { parseJsonField } = require('../utils/jsonField');

const RsvpSubmission = sequelize.define(
  'RsvpSubmission',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    guest_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'guests',
        key: 'id',
      },
    },
    event_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'events',
        key: 'id',
      },
    },
    couple_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'couple_profiles',
        key: 'id',
      },
    },
    attending: {
      type: DataTypes.ENUM('yes', 'no', 'maybe'),
      allowNull: false,
      defaultValue: 'yes',
    },
    meal_choice: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    dietary_note: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    song_request: {
      type: DataTypes.STRING(300),
      allowNull: true,
    },
    custom_answers: {
      // JSON: { questionId: answer }
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      get: parseJsonField('custom_answers'),
    },
    submitted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'rsvp_submissions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = RsvpSubmission;
