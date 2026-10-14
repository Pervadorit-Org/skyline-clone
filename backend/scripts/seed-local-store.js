/**
 * Local dev only: create the `goldendragon` store (a store_admin row) so the
 * website at http://localhost:5173 can sign in / sign up. The backend only
 * accepts a store code that exists as a store_admin, and the restored backup
 * does not contain this one.
 *
 *   node scripts/seed-local-store.js
 *
 * Inserts rows only (no schema change), the same way Admin > Stores > Create does.
 * Idempotent: re-running reports the store already exists and changes nothing.
 * Refuses production and any non-local database. The store-admin login is written
 * to ../admin/LOCAL_LOGIN.md (gitignored); override with STORE_CODE / DISTRIBUTOR_CODE.
 */
require('dotenv').config({ override: true });
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('../src/db/models');
const { ROLES } = require('../src/constants/roles');
const { encryptPassword, validatePasswordStrength } = require('../src/utils/common');
const { seedDefaultStorePaymentProviders } = require('../src/services/store/seedDefaultStorePaymentProviders.service');

const host = String(process.env.DB_HOST || 'localhost').trim().toLowerCase();
if ((process.env.NODE_ENV || 'development') === 'production' || !['', 'localhost', '127.0.0.1', '::1'].includes(host)) {
  console.error('Refusing to run: this script only seeds a local development database.');
  process.exit(1);
}

const storeCode = String(process.env.STORE_CODE || 'goldendragon').trim().toLowerCase();
const distributorCode = String(process.env.DISTRIBUTOR_CODE || 'casinoking').trim().toLowerCase();
const email = `store-admin@${storeCode}.local`;
const username = `${storeCode}_admin`;
const password = `Gd-${crypto.randomBytes(6).toString('hex')}-${crypto.randomInt(10, 99)}A!`;

async function main() {
  const check = validatePasswordStrength(password);
  if (!check.valid) throw new Error(check.error);
  await db.sequelize.authenticate();

  const distributor = await db.User.findOne({
    where: { role: ROLES.DISTRIBUTOR_ADMIN, distributorCode, isActive: true },
    attributes: ['userId'],
  });
  if (!distributor) throw new Error(`Distributor "${distributorCode}" not found or inactive.`);

  const existing = await db.User.findOne({
    where: { role: ROLES.STORE_ADMIN, storeRoleId: null, distributorCode, storeCode, deletedAt: null },
    attributes: ['userId'],
  });
  if (existing) {
    console.log(`Store "${storeCode}" already exists (user_id ${existing.userId}). Nothing changed.`);
    return;
  }

  await db.User.create({
    email,
    password: encryptPassword(password),
    username,
    firstName: 'Golden',
    lastName: 'Dragon',
    role: ROLES.STORE_ADMIN,
    isAdmin: true,
    distributorCode,
    storeCode,
    userSiteUrl: null,
    isActive: true,
    isEmailVerified: true,
    signInType: 'NORMAL',
  });
  await seedDefaultStorePaymentProviders(distributorCode, storeCode).catch(() => {});

  const note = path.join(__dirname, '..', '..', 'admin', 'LOCAL_LOGIN.md');
  fs.appendFileSync(
    note,
    `\n# Local store admin (store "${storeCode}", distributor "${distributorCode}")\nemail: ${email}\npassword: ${password}\n`
  );
  console.log(`Store "${storeCode}" created under distributor "${distributorCode}". Store-admin login appended to ${note}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => db.sequelize.close());
