'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EventGuestAccess = sequelize.define(
  'EventGuestAccess',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    event_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'events',
        key: 'id',
      },
    },
    guest_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'guests',
        key: 'id',
      },
    },
  },
  {
    tableName: 'event_guest_access',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['event_id', 'guest_id'],
        name: 'unique_event_guest',
      },
    ],
  }
);

module.exports = EventGuestAccess;
