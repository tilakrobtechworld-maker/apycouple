'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { parseJsonField } = require('../utils/jsonField');

const RsvpQuestion = sequelize.define(
  'RsvpQuestion',
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
    event_id: {
      // null = applies to all events
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'events',
        key: 'id',
      },
    },
    question_text: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    question_type: {
      type: DataTypes.ENUM('text', 'select', 'radio', 'checkbox', 'number'),
      allowNull: false,
      defaultValue: 'text',
    },
    options: {
      // JSON array of option strings for select/radio/checkbox
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      get: parseJsonField('options'),
    },
    is_required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: 'rsvp_questions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = RsvpQuestion;
