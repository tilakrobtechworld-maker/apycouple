'use strict';

/**
 * mysql2 returns JSON-column values as raw strings (it doesn't auto-parse
 * them), and this Sequelize version's JSON DataType has no inbound `parse`
 * registered for the mysql dialect, so DataTypes.JSON fields come back as
 * un-parsed strings instead of arrays/objects. Use as a model field's
 * `get()` to transparently parse them back into real JS values.
 */
const parseJsonField = (fieldName) =>
  function () {
    const raw = this.getDataValue(fieldName);
    if (typeof raw !== 'string') return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  };

module.exports = { parseJsonField };
