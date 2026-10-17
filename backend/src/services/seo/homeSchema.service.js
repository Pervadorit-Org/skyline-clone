'use strict';

const db = require('../../db/models');
const {
  PLAYJUWA,
  PLAYJUWA_ORIGIN,
  isPlayjuwa,
  buildManagedSchema,
  homeAuto,
  schemaFromBody
} = require('./pageSchema.service');

/** Stored as one JSON row in the existing `settings` table (no separate table). */
const SETTINGS_KEY = 'home_page_schema';

function parseRow(row) {
  if (!row?.value) return null;
  try {
    const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function present(plain) {
  return {
    schemaEnabled: plain ? plain.schemaEnabled !== false : true,
    schemaType: plain?.schemaType || 'WebPage',
    schemaFields: plain?.schemaFields || {},
    schemaCustom: plain?.schemaCustom || ''
  };
}

function buildHome(record, { origin, storeLabel } = {}) {
  const saved = present(record);
  const auto = homeAuto({
    origin: origin || PLAYJUWA_ORIGIN,
    storeLabel: storeLabel || 'dragonfury.casino'
  });
  let schema = null;
  let schemaError = '';
  try {
    schema = buildManagedSchema({ ...saved, auto });
  } catch (err) {
    schemaError = err.message || 'Schema JSON-LD is not valid JSON.';
  }
  return { ...saved, auto, schema, schemaError };
}

async function getHome({ origin, storeLabel } = {}) {
  const row = await db.Setting.findOne({
    where: { key: SETTINGS_KEY, distributorCode: null, storeCode: PLAYJUWA }
  });
  return buildHome(parseRow(row), { origin, storeLabel });
}

async function saveHome(body = {}) {
  const saved = schemaFromBody(body, 'WebPage');
  const value = JSON.stringify(saved);
  const [row] = await db.Setting.findOrCreate({
    where: { key: SETTINGS_KEY, distributorCode: null, storeCode: PLAYJUWA },
    defaults: { key: SETTINGS_KEY, distributorCode: null, storeCode: PLAYJUWA, value }
  });
  await row.update({ value });
  return buildHome(saved, { origin: PLAYJUWA_ORIGIN, storeLabel: 'dragonfury.casino' });
}

module.exports = {
  isPlayjuwa,
  getHome,
  saveHome
};
