'use strict';

/**
 * Gold Coins (GC) amount per deposit package.
 *
 * Stored in the existing `settings` table (key = deposit_package_gc_<packageId>, value = JSON { gc })
 * scoped by the package's distributor/store, so no new column or migration is needed.
 * A package with no row (or gc <= 0) is an SC-only package.
 */

const { Op } = require('sequelize');
const db = require('../../db/models');

const KEY_PREFIX = 'deposit_package_gc_';
const MAX_GC = 1e12;

function gcKey(packageId) {
  return `${KEY_PREFIX}${packageId}`;
}

function parseGcValue(raw) {
  if (raw == null || raw === '') return 0;
  try {
    const parsed = JSON.parse(raw);
    const n = Math.floor(Number(parsed?.gc));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Validate admin input. Blank / null / 0 clears the GC amount. */
function parseGcInput(value) {
  if (value == null || value === '') return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > MAX_GC) {
    const err = new Error('gc_coin must be a non-negative number.');
    err.statusCode = 400;
    throw err;
  }
  return Math.floor(n);
}

/** @returns {Promise<Map<number, number>>} packageId -> GC amount (only packages with GC > 0) */
async function getPackageGcMap(packageIds, { transaction = null } = {}) {
  const ids = [...new Set((packageIds || []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
  const out = new Map();
  if (!ids.length) return out;
  const rows = await db.Setting.findAll({
    where: { key: { [Op.in]: ids.map(gcKey) } },
    attributes: ['key', 'value'],
    raw: true,
    transaction
  });
  rows.forEach((row) => {
    const id = Number(String(row.key).slice(KEY_PREFIX.length));
    const gc = parseGcValue(row.value);
    if (Number.isInteger(id) && gc > 0) out.set(id, gc);
  });
  return out;
}

async function getPackageGc(packageId, opts = {}) {
  const map = await getPackageGcMap([packageId], opts);
  return map.get(Number(packageId)) || 0;
}

async function setPackageGc(pkg, gc) {
  const plain = pkg.get ? pkg.get({ plain: true }) : pkg;
  const where = {
    key: gcKey(plain.id),
    distributorCode: plain.distributorCode,
    storeCode: plain.storeCode
  };
  const existing = await db.Setting.findOne({ where });
  if (!(gc > 0)) {
    if (existing) await existing.destroy();
    return 0;
  }
  const value = JSON.stringify({ gc });
  if (existing) await existing.update({ value });
  else await db.Setting.create({ ...where, value });
  return gc;
}

async function removePackageGc(packageId) {
  await db.Setting.destroy({ where: { key: gcKey(packageId) } });
}

module.exports = {
  parseGcInput,
  getPackageGcMap,
  getPackageGc,
  setPackageGc,
  removePackageGc
};
