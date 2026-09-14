'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');

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
  },
  {
    tableName: 'guests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Guest;
