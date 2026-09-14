'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const RegistryItem = sequelize.define(
  'RegistryItem',
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
    store_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    store_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    item_name: {
      type: DataTypes.STRING(300),
      allowNull: false,
    },
    item_url: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    item_image_url: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    is_purchased: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    item_type: {
      type: DataTypes.ENUM('product', 'cash_fund', 'honeymoon_fund'),
      allowNull: false,
      defaultValue: 'product',
    },
    notes: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    tableName: 'registry_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = RegistryItem;
