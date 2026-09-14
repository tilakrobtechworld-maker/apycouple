'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const GuestParty = sequelize.define(
  'GuestParty',
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
    party_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    total_members: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    tableName: 'guest_parties',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = GuestParty;
