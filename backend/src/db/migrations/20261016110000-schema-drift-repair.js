'use strict';

/**
 * Brings databases that missed earlier migrations in line with the models:
 * blog_posts SEO columns, footer_pages page-schema columns and the page_schemas table.
 * Every statement is idempotent.
 */
module.exports = {
  async up(queryInterface, Sequelize, opts = {}) {
    const transaction = opts.transaction;
    const q = (sql) => queryInterface.sequelize.query(sql, { transaction });

    await q(`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS title_image_alt VARCHAR(512)`);
    await q(`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS canonical_url VARCHAR(1024)`);

    await q(`ALTER TABLE footer_pages ADD COLUMN IF NOT EXISTS schema_enabled BOOLEAN NOT NULL DEFAULT true`);
    await q(`ALTER TABLE footer_pages ADD COLUMN IF NOT EXISTS schema_type VARCHAR(32) NOT NULL DEFAULT 'WebPage'`);
    await q(`ALTER TABLE footer_pages ADD COLUMN IF NOT EXISTS schema_fields JSONB NOT NULL DEFAULT '{}'::jsonb`);
    await q(`ALTER TABLE footer_pages ADD COLUMN IF NOT EXISTS schema_custom TEXT`);

    await q(`
      CREATE TABLE IF NOT EXISTS page_schemas (
        id SERIAL PRIMARY KEY,
        store_code VARCHAR(64) NOT NULL,
        page_key VARCHAR(64) NOT NULL,
        schema_enabled BOOLEAN NOT NULL DEFAULT true,
        schema_type VARCHAR(32) NOT NULL DEFAULT 'WebPage',
        schema_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
        schema_custom TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (store_code, page_key)
      )
    `);
  },

  async down() {
    /* Repair migration: nothing to undo. */
  }
};
