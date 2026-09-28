'use strict';

const { Op } = require('sequelize');
const sequelize = require('../config/database');

const isPostgres = sequelize.getDialect() === 'postgres';

// MySQL's LIKE is case-insensitive by default; Postgres's is not (needs ILIKE).
const likeOp = isPostgres ? Op.iLike : Op.like;

// Quote an identifier for raw SQL fragments (backticks on MySQL, double quotes on Postgres).
const q = (name) => (isPostgres ? `"${name}"` : `\`${name}\``);

module.exports = { isPostgres, likeOp, q };
