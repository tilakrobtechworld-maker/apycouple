'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Event = sequelize.define(
  'Event',
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
    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    event_type: {
      type: DataTypes.ENUM(
        'ceremony',
        'reception',
        'sangeet',
        'haldi',
        'mehendi',
        'rehearsal',
        'engagement',
        'other'
      ),
      allowNull: false,
      defaultValue: 'ceremony',
    },
    venue_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    gps_lat: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    gps_lng: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    dress_code: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    maps_embed_url: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
  },
  {
    tableName: 'events',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Event;
