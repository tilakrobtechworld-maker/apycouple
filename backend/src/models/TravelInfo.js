'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const TravelInfo = sequelize.define(
  'TravelInfo',
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
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    hotel_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    hotel_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    discount_code: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    booking_link: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    maps_link: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    category: {
      type: DataTypes.ENUM('hotel', 'attraction', 'transport', 'restaurant', 'other'),
      allowNull: false,
      defaultValue: 'hotel',
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: 'travel_info',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = TravelInfo;
