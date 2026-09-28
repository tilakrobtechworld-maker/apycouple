'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { parseJsonField } = require('../utils/jsonField');

const Guest = sequelize.define(
  'Guest',
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
    party_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'guest_parties',
        key: 'id',
      },
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    side: {
      type: DataTypes.ENUM('bride', 'groom', 'mutual'),
      allowNull: false,
      defaultValue: 'mutual',
    },
    category: {
      type: DataTypes.ENUM('vip', 'family', 'friend', 'colleague', 'other'),
      allowNull: false,
      defaultValue: 'friend',
    },
    dietary_restrictions: {
      type: DataTypes.STRING(300),
      allowNull: true,
    },
    plus_one_allowed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    plus_one_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    rsvp_token: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      defaultValue: () => uuidv4(),
    },
    invited_via: {
      type: DataTypes.ENUM('email', 'sms', 'link', 'manual'),
      allowNull: false,
      defaultValue: 'manual',
    },
    arrival_datetime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    travel_mode: {
      type: DataTypes.ENUM('flight', 'train', 'ship', 'other'),
      allowNull: true,
    },
    // Flight/train number for the arrival leg (kept as `travel_details` for
    // backwards compatibility with already-submitted RSVPs).
    travel_details: {
      type: DataTypes.STRING(300),
      allowNull: true,
    },
    departure_datetime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    arrival_ticket_details: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    departure_ticket_details: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    arrival_location: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    departure_location: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    departure_travel_number: {
      type: DataTypes.STRING(300),
      allowNull: true,
    },
    arrival_terminal: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    departure_terminal: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    luggage_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    party_size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    // Names of the other people in the party (not including this guest),
    // one entry per extra headcount in party_size.
    party_member_names: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      get: parseJsonField('party_member_names'),
    },
  },
  {
    tableName: 'guests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Guest;
