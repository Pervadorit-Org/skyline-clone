'use strict';

/** Marketing opt-ins shown on Settings → Communication (both default to off). */
module.exports = {
  async up(queryInterface, Sequelize, opts = {}) {
    const transaction = opts.transaction;
    await queryInterface.sequelize.query(
      `ALTER TABLE users
         ADD COLUMN IF NOT EXISTS marketing_email_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
         ADD COLUMN IF NOT EXISTS marketing_sms_opt_in BOOLEAN NOT NULL DEFAULT FALSE`,
      { transaction }
    );
  },

  async down(queryInterface, Sequelize, opts = {}) {
    const transaction = opts.transaction;
    await queryInterface.sequelize.query(
      `ALTER TABLE users DROP COLUMN IF EXISTS marketing_email_opt_in, DROP COLUMN IF EXISTS marketing_sms_opt_in`,
      { transaction }
    );
  }
};
