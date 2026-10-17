'use strict';

/** Optional middle name on the profile (shown on Settings → Profile). */
module.exports = {
  async up(queryInterface, Sequelize, opts = {}) {
    const transaction = opts.transaction;
    await queryInterface.sequelize.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100) NULL`,
      { transaction }
    );
  },

  async down(queryInterface, Sequelize, opts = {}) {
    const transaction = opts.transaction;
    await queryInterface.sequelize.query(`ALTER TABLE users DROP COLUMN IF EXISTS middle_name`, { transaction });
  }
};
