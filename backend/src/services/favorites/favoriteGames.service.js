'use strict';

const db = require('../../db/models');

const KEY_PREFIX = 'favorite_games_user_';
const MAX_FAVORITES = 500;
/** Ids look like "platform:12" or "slot:pragmatic-gates-of-olympus". */
const ID_PATTERN = /^(platform|slot):[^\s]{1,120}$/;

function key(userId) {
  return `${KEY_PREFIX}${userId}`;
}

function parseIds(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    const list = Array.isArray(parsed) ? parsed : parsed?.ids;
    return Array.isArray(list) ? list.filter((id) => typeof id === 'string' && ID_PATTERN.test(id)) : [];
  } catch (_) {
    return [];
  }
}

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

async function getFavorites(userId) {
  const row = await db.Setting.findOne({
    where: { key: key(userId), distributorCode: null, storeCode: null },
    attributes: ['value'],
    raw: true
  });
  return parseIds(row?.value);
}

/** Apply add/remove changes to the saved list under a per-user lock, so two devices cannot overwrite each other. */
async function updateFavorites(userId, { add = [], remove = [] }) {
  const toAdd = [...new Set(add)];
  const toRemove = new Set(remove);
  if ([...toAdd, ...toRemove].some((id) => typeof id !== 'string' || !ID_PATTERN.test(id))) {
    throw badRequest('Invalid game id.');
  }

  return db.sequelize.transaction(async (t) => {
    await db.sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:k))', {
      replacements: { k: `favorites:${userId}` },
      transaction: t
    });
    const where = { key: key(userId), distributorCode: null, storeCode: null };
    const row = await db.Setting.findOne({ where, transaction: t, lock: t.LOCK.UPDATE });
    const current = parseIds(row?.value);
    const next = current.filter((id) => !toRemove.has(id));
    toAdd.forEach((id) => {
      if (!toRemove.has(id) && !next.includes(id)) next.push(id);
    });
    if (next.length > MAX_FAVORITES) throw badRequest(`You can save up to ${MAX_FAVORITES} favorites.`);
    const value = JSON.stringify({ ids: next });
    if (row) await row.update({ value }, { transaction: t });
    else await db.Setting.create({ ...where, value }, { transaction: t });
    return next;
  });
}

module.exports = { getFavorites, updateFavorites };
