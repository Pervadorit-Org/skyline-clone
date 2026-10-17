'use strict';

/**
 * Local dev: configure the `goldendragon` store for the GC / SC model using ONLY existing tables
 * (settings, deposit_package_groups, deposit_packages). No schema change, no migration.
 *
 *   node scripts/seed-goldendragon-gc-config.js
 *
 * Inserts only what is missing and never overwrites an existing row, so it is safe to re-run and it
 * preserves whatever an admin already configured. Refuses production / non-local databases.
 *
 *  - welcome_signup_bonus_settings : 150,000 GC + 2 SC (the offer shown on goldendragon.casino)
 *  - deposit_package_settings      : packages enabled
 *  - deposit_packages              : PLACEHOLDER GC packages (prices copied from the dragonfury seed; GC and free-SC
 *                                    amounts are placeholders — edit them in Admin > Deposit Packages)
 *  - daily_bonus_settings          : untouched here (already configured from the reference 7-day schedule)
 */
require('dotenv').config({ override: true });
const db = require('../src/db/models');
const { ensureDefaultGroups } = require('../src/services/depositPackages/getDepositPackagesCatalog.service');

const host = String(process.env.DB_WRITE_HOST || process.env.DB_HOST || 'localhost').trim().toLowerCase();
if ((process.env.NODE_ENV || 'development') === 'production' || !['', 'localhost', '127.0.0.1', '::1'].includes(host)) {
  console.error('Refusing to run: this script only seeds a local development database.');
  process.exit(1);
}

const STORE_CODE = 'goldendragon';
const DISTRIBUTOR_CODE = 'casinoking';

// price (USD), GC sold, free promotional SC (0 = not eligible for a free SC bonus)
const GENERAL_PACKS = [
  { title: '50K Gold Coins', price: 4.99, gc: 50000, freeSc: 5, sort: 10 },
  { title: '100K Gold Coins', price: 9.99, gc: 100000, freeSc: 10, sort: 20 },
  { title: '150K Gold Coins', price: 14.99, gc: 150000, freeSc: 15, sort: 30 },
  { title: '200K Gold Coins', price: 19.99, gc: 200000, freeSc: 20, sort: 40 },
  { title: '500K Gold Coins', price: 49.99, gc: 500000, freeSc: 53, sort: 50 }
];

async function ensureSetting(key, valueObj) {
  const where = { key, distributorCode: DISTRIBUTOR_CODE, storeCode: STORE_CODE };
  const existing = await db.Setting.findOne({ where });
  if (existing) return { key, action: 'kept existing' };
  await db.Setting.create({ ...where, value: JSON.stringify(valueObj) });
  return { key, action: 'inserted' };
}

async function main() {
  await db.sequelize.authenticate();
  const report = [];

  report.push(
    await ensureSetting('welcome_signup_bonus_settings', {
      enabled: true,
      amountSc: 2,
      amountGc: 150000,
      modalImageUrl: null,
      // GC is free-to-play entertainment: no purchase needed before playing with the welcome coins.
      requireDepositToActivateBonus: false,
      updatedBy: 'seed-goldendragon-gc-config',
      updatedAt: new Date().toISOString()
    })
  );
  report.push(await ensureSetting('deposit_package_settings', { enabled: true }));

  const scope = { distributorCode: DISTRIBUTOR_CODE, storeCode: STORE_CODE };
  const groups = await ensureDefaultGroups(scope);
  const general = groups.find((g) => g.groupKey === 'general');
  if (!general) throw new Error('general package group missing');

  const existingCount = await db.DepositPackage.count({ where: { groupId: general.id } });
  if (existingCount > 0) {
    report.push({ key: 'deposit_packages', action: `kept existing (${existingCount} rows)` });
  } else {
    for (const p of GENERAL_PACKS) {
      await db.DepositPackage.create({
        groupId: general.id,
        distributorCode: DISTRIBUTOR_CODE,
        storeCode: STORE_CODE,
        title: p.title,
        finalSc: p.freeSc,
        gcCoin: p.gc,
        actualPrice: p.price,
        finalPrice: p.price,
        sortOrder: p.sort,
        isActive: true
      });
    }
    report.push({ key: 'deposit_packages', action: `inserted ${GENERAL_PACKS.length} placeholder packages` });
  }

  console.table(report);
  await db.sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
