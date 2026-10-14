'use strict';

/**
 * Store-flow tests: signup, first/returning login (email + username), welcome bonus, daily rewards
 * (one claim per UTC day, 7-day cycle, missed-day rule, restart, duplicate + concurrent claims),
 * wallet credit, claim history, store isolation.
 *
 *   cd backend && node --test --test-concurrency=1 tests/
 *
 * Safety (no schema change, no migration):
 *  - Refuses to run in production or against a non-local database.
 *  - Works ONLY on throw-away fixture stores (`zzgdtest`, `zzgdtestb`) and the users created here.
 *  - Never touches balances or rows of any real store. The final cleanup deletes only the fixture rows
 *    this file created (checked by store code + user id), and a before/after snapshot proves that no
 *    pre-existing data changed.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const crypto = require('crypto');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const host = String(process.env.DB_HOST || 'localhost').trim().toLowerCase();
if ((process.env.NODE_ENV || 'development') === 'production' || !['', 'localhost', '127.0.0.1', '::1'].includes(host)) {
  throw new Error('Refusing to run store-flow tests: local development database only.');
}

const { QueryTypes } = require('sequelize');
const db = require('../src/db/models');
const { encryptPassword } = require('../src/utils/common');
const { register } = require('../src/services/auth/register.service');
const { login } = require('../src/services/auth/login.service');
const { grantWelcomeSignupBonus } = require('../src/services/wallet/grantWelcomeSignupBonus.service');
const { getDailyBonusStatus } = require('../src/services/dailyBonus/getDailyBonusStatus.service');
const { claimDailyBonus } = require('../src/services/dailyBonus/claimDailyBonus.service');

const STORE_A = 'zzgdtest';
const STORE_B = 'zzgdtestb';
const DIST = 'zzgdtestdist';
const TEST_STORES = [STORE_A, STORE_B];

const createdUserIds = [];
const track = (user) => {
  createdUserIds.push(user.userId);
  return user;
};

const strongPassword = () => `Aa1!${crypto.randomBytes(8).toString('hex')}`;

/** Run fn with "now" fixed to a UTC day (the daily reward resets at 00:00 UTC). */
async function atDay(day, fn) {
  const RealDate = Date;
  const fixed = new RealDate(`${day}T10:00:00.000Z`).getTime();
  class FakeDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(fixed);
      else super(...args);
    }

    static now() {
      return fixed;
    }
  }
  global.Date = FakeDate;
  try {
    return await fn();
  } finally {
    global.Date = RealDate;
  }
}

const dayPlus = (base, n) => {
  const d = new Date(`${base}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

async function rejects(promise, statusCode) {
  try {
    await promise;
  } catch (err) {
    if (statusCode != null) assert.equal(err.statusCode, statusCode, `expected HTTP ${statusCode}, got ${err.statusCode}: ${err.message}`);
    return err;
  }
  assert.fail('expected the call to be rejected');
  return null;
}

async function makeStoreAdmin(storeCode) {
  return track(
    await db.User.create({
      email: `admin@${storeCode}.test`,
      password: encryptPassword(strongPassword()),
      username: `${storeCode}_admin`,
      role: 'store_admin',
      isAdmin: true,
      distributorCode: DIST,
      storeCode,
      isActive: true,
      isEmailVerified: true,
      signInType: 'NORMAL'
    })
  );
}

async function putSetting(key, storeCode, valueObj) {
  const where = { key, distributorCode: DIST, storeCode };
  const [row] = await db.Setting.findOrCreate({ where, defaults: { ...where, value: JSON.stringify(valueObj) } });
  await row.update({ value: JSON.stringify(valueObj) });
}

const DAY_AMOUNTS = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 1.0];
const dailySettings = (extra = {}) => ({
  enabled: true,
  repeatAfterComplete: false,
  resetOnMiss: false,
  days: DAY_AMOUNTS.map((amountSc, i) => ({
    dayIndex: i + 1,
    rewardType: 'sc_coins',
    amountSc,
    spinCount: 1,
    percentOff: 10,
    packageScope: 'all',
    packageIds: [],
    label: `Day ${i + 1}`
  })),
  ...extra
});

async function makePlayer(storeCode, label) {
  const pw = strongPassword();
  const user = track(
    await db.User.create({
      email: `${label}@${storeCode}.test`,
      password: encryptPassword(pw),
      username: label,
      role: 'user',
      distributorCode: DIST,
      storeCode,
      isActive: true,
      isEmailVerified: true,
      signInType: 'NORMAL'
    })
  );
  return { user, pw };
}

const bsc = async (userId) => {
  const w = await db.Wallet.findOne({ where: { userId, currencyCode: 'BSC' } });
  return w ? Number(w.balance) : 0;
};
const money = (n) => Math.round(Number(n) * 100) / 100;

const count = async (sql, replacements = {}) => {
  const [row] = await db.sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
  return Number(row.n);
};

/** Fingerprint of data that is NOT a fixture: it must be identical before and after the run. */
async function existingDataSnapshot() {
  const [row] = await db.sequelize.query(
    `SELECT
       (SELECT count(*) FROM users WHERE store_code IS DISTINCT FROM :a AND store_code IS DISTINCT FROM :b) AS users,
       (SELECT count(*) FROM wallets w JOIN users u ON u.user_id = w.user_id
          WHERE u.store_code IS DISTINCT FROM :a AND u.store_code IS DISTINCT FROM :b) AS wallets,
       (SELECT COALESCE(sum(w.balance),0) FROM wallets w JOIN users u ON u.user_id = w.user_id
          WHERE u.store_code IS DISTINCT FROM :a AND u.store_code IS DISTINCT FROM :b) AS balance_sum,
       (SELECT count(*) FROM user_transactions t JOIN users u ON u.user_id = t.user_id
          WHERE u.store_code IS DISTINCT FROM :a AND u.store_code IS DISTINCT FROM :b) AS transactions,
       (SELECT count(*) FROM user_daily_bonus_claims c JOIN users u ON u.user_id = c.user_id
          WHERE u.store_code IS DISTINCT FROM :a AND u.store_code IS DISTINCT FROM :b) AS daily_claims,
       (SELECT count(*) FROM settings WHERE store_code IS DISTINCT FROM :a AND store_code IS DISTINCT FROM :b) AS settings`,
    { replacements: { a: STORE_A, b: STORE_B }, type: QueryTypes.SELECT }
  );
  return row;
}

let beforeSnapshot;
let playerA; // registered through the real signup flow
let pwA;
let dailyUser; // walks through the whole 7-day scenario (tests 5-9)
let raceUser; // concurrent-claim fixture (tests 10-11)

test.before(async () => {
  await db.sequelize.authenticate();
  beforeSnapshot = await existingDataSnapshot();
  // refuse to reuse leftovers of an interrupted earlier run
  const leftovers = await count(`SELECT count(*) AS n FROM users WHERE store_code IN (:a, :b)`, { a: STORE_A, b: STORE_B });
  assert.equal(leftovers, 0, 'fixture stores already contain rows from an interrupted run; clean them first');

  await makeStoreAdmin(STORE_A);
  await makeStoreAdmin(STORE_B);
  await putSetting('welcome_signup_bonus_settings', STORE_A, { enabled: true, amountSc: 2, requireDepositToActivateBonus: false });
  // store B: no welcome / daily rows at all (feature off)
  await putSetting('daily_bonus_settings', STORE_A, dailySettings());
});

test.after(async () => {
  try {
    // Delete ONLY rows this file created: every id must belong to a fixture store.
    const rows = await db.sequelize.query(
      `SELECT user_id, store_code FROM users WHERE user_id IN (:ids)`,
      { replacements: { ids: createdUserIds.length ? createdUserIds : [0] }, type: QueryTypes.SELECT }
    );
    for (const r of rows) assert.ok(TEST_STORES.includes(r.store_code), `refusing to delete user ${r.user_id} of store ${r.store_code}`);
    const ids = rows.map((r) => r.user_id);
    if (ids.length) {
      await db.sequelize.query(`DELETE FROM user_transactions WHERE user_id IN (:ids)`, { replacements: { ids } });
      await db.sequelize.query(`DELETE FROM wallet_ledger WHERE user_id IN (:ids)`, { replacements: { ids } }).catch(() => {});
      await db.sequelize.query(`DELETE FROM notifications WHERE user_id IN (:ids)`, { replacements: { ids } }).catch(() => {});
      await db.sequelize.query(`DELETE FROM users WHERE user_id IN (:ids) AND store_code IN (:stores)`, {
        replacements: { ids, stores: TEST_STORES }
      });
    }
    await db.sequelize.query(`DELETE FROM settings WHERE store_code IN (:stores)`, { replacements: { stores: TEST_STORES } });
  } catch (err) {
    console.warn('Fixture cleanup incomplete (fixture rows only, store codes zzgdtest*):', err.message);
  } finally {
    await db.sequelize.close();
  }
});

/* ------------------------------ 1-3: signup + login ------------------------------ */

test('1. new user signup creates the account, the 4 wallets and the welcome bonus', async () => {
  pwA = strongPassword();
  const res = await register({
    email: `player1@${STORE_A}.test`,
    password: pwA,
    username: 'player1zz',
    firstName: '',
    lastName: '',
    code: STORE_A,
    clientStoreCode: STORE_A
  });
  assert.ok(res.user && res.token, 'signup returns user + token (email verification is off in the local env)');
  playerA = track(await db.User.findByPk(res.user.userId));
  assert.equal(playerA.storeCode, STORE_A);
  assert.equal(playerA.distributorCode, DIST);
  assert.equal(res.welcome_bonus_granted, true);

  const wallets = await db.Wallet.findAll({ where: { userId: playerA.userId } });
  assert.deepEqual(wallets.map((w) => w.currencyCode).sort(), ['BSC', 'PSC', 'RSC', 'SC']);
  assert.equal(money(await bsc(playerA.userId)), 2);
});

test('2. first login and returning login (email), token carries this store', async () => {
  const jwt = require('jsonwebtoken');
  for (const attempt of ['first', 'returning']) {
    const res = await login({ email: `PLAYER1@${STORE_A}.test`, password: pwA, clientStoreCode: STORE_A });
    assert.ok(res.token, `${attempt} login returns a token`);
    const claims = jwt.decode(res.token);
    assert.equal(claims.userId, playerA.userId);
    assert.equal(claims.storeCode, STORE_A);
  }
  // logging in never grants anything
  assert.equal(money(await bsc(playerA.userId)), 2);
  assert.equal(await count(`SELECT count(*) AS n FROM user_transactions WHERE user_id = :id AND type = 'welcome_signup'`, { id: playerA.userId }), 1);

  await rejects(login({ email: `player1@${STORE_A}.test`, password: 'Wrong-Pass-1!', clientStoreCode: STORE_A }), 401);
});

test('3. username login works only for stores that enable it, and stays inside the store', async () => {
  const keep = process.env.USERNAME_LOGIN_STORE_CODES;
  try {
    process.env.USERNAME_LOGIN_STORE_CODES = STORE_A;
    const ok = await login({ email: 'PLAYER1ZZ', password: pwA, clientStoreCode: STORE_A });
    assert.equal(ok.user.userId, playerA.userId);

    // same username, other store, different password
    const other = await makePlayer(STORE_B, 'player1zz');
    // username login is OFF for store B: unchanged legacy behaviour (a non-email, non-phone identifier is refused)
    const off = await rejects(login({ email: 'player1zz', password: other.pw, clientStoreCode: STORE_B }), 400);
    assert.equal(off.code, 'INVALID_LOGIN_IDENTIFIER');
    // by email it still works there
    const viaEmail = await login({ email: other.user.email, password: other.pw, clientStoreCode: STORE_B });
    assert.equal(viaEmail.user.userId, other.user.userId);

    process.env.USERNAME_LOGIN_STORE_CODES = `${STORE_A},${STORE_B}`;
    const b = await login({ email: 'player1zz', password: other.pw, clientStoreCode: STORE_B });
    assert.equal(b.user.userId, other.user.userId, 'store B username resolves to store B user');
    // A's password must not open B's account with the same username
    await rejects(login({ email: 'player1zz', password: pwA, clientStoreCode: STORE_B }), 401);
    // and A's user cannot sign in through store B
    await rejects(login({ email: playerA.email, password: pwA, clientStoreCode: STORE_B }), 401);
  } finally {
    if (keep === undefined) delete process.env.USERNAME_LOGIN_STORE_CODES;
    else process.env.USERNAME_LOGIN_STORE_CODES = keep;
  }
});

/* ------------------------------ 4: welcome bonus ------------------------------ */

test('4. welcome bonus is granted once: repeat and simultaneous grants add nothing', async () => {
  // repeat for the registered user
  const again = await grantWelcomeSignupBonus(playerA.userId, { clientStoreCode: STORE_A });
  assert.ok(!again || again.granted !== true, 'second grant is a no-op');
  assert.equal(money(await bsc(playerA.userId)), 2);

  // simultaneous grants for a user that never got one
  const { user } = await makePlayer(STORE_A, 'welcomerace');
  const results = await Promise.allSettled(
    Array.from({ length: 6 }, () => grantWelcomeSignupBonus(user.userId, { clientStoreCode: STORE_A }))
  );
  const granted = results.filter((r) => r.status === 'fulfilled' && r.value && r.value.granted === true);
  assert.equal(granted.length, 1, 'exactly one of 6 parallel grants succeeds');
  assert.equal(money(await bsc(user.userId)), 2);
  assert.equal(await count(`SELECT count(*) AS n FROM user_transactions WHERE user_id = :id AND type = 'welcome_signup'`, { id: user.userId }), 1);
  assert.equal(await count(`SELECT count(*) AS n FROM wallet_sc_ledger WHERE user_id = :id AND event_type = 'WELCOME_BONUS'`, { id: user.userId }), 1);

  // a store without a welcome setting grants nothing
  const b = await makePlayer(STORE_B, 'welcomeoff');
  const none = await grantWelcomeSignupBonus(b.user.userId, { clientStoreCode: STORE_B }).catch(() => null);
  assert.ok(!none || none.granted !== true);
  assert.equal(await bsc(b.user.userId), 0);
});

/* ------------------------------ 5-9: daily rewards ------------------------------ */

const BASE = '2031-03-01';

test('5. daily reward: first claim credits the wallet, writes history, and cannot repeat the same UTC day', async () => {
  const { user } = await makePlayer(STORE_A, 'daily1');
  dailyUser = user;

  const peek = await atDay(BASE, () => getDailyBonusStatus(user.userId, { start: false }));
  assert.equal(peek.available, true);
  assert.equal(peek.campaign, null);
  assert.equal(peek.days[0].state, 'claimable');

  const res = await atDay(BASE, () => claimDailyBonus(user.userId, 1));
  assert.equal(res.day_index, 1);
  assert.equal(res.amount_sc_credited, 0.2);
  assert.equal(money(await bsc(user.userId)), 0.2);
  assert.equal(await count(`SELECT count(*) AS n FROM user_transactions WHERE user_id = :id AND type = 'daily_bonus'`, { id: user.userId }), 1);
  assert.equal(await count(`SELECT count(*) AS n FROM wallet_sc_ledger WHERE user_id = :id AND event_type = 'DAILY_BONUS'`, { id: user.userId }), 1);
  assert.equal(await count(`SELECT count(*) AS n FROM user_daily_bonus_claims WHERE user_id = :id`, { id: user.userId }), 1);

  await atDay(BASE, async () => {
    await rejects(claimDailyBonus(user.userId, 1), 400); // same day, same reward
    await rejects(claimDailyBonus(user.userId, 2), 400); // same day, next reward
  });
  assert.equal(money(await bsc(user.userId)), 0.2, 'rejected claims credit nothing');
});

test('6. next-day eligibility and strict day order', async () => {
  const user = dailyUser;
  await atDay(dayPlus(BASE, 1), async () => {
    await rejects(claimDailyBonus(user.userId, 4), 400); // Day 3 not claimed yet
    const r = await claimDailyBonus(user.userId, 2);
    assert.equal(r.amount_sc_credited, 0.3);
  });
  assert.equal(money(await bsc(user.userId)), 0.5);
});

test('7. missed day: no reset while resetOnMiss is off (existing behaviour kept)', async () => {
  const user = dailyUser;
  // BASE+2 skipped, claim on BASE+3
  const r = await atDay(dayPlus(BASE, 3), () => claimDailyBonus(user.userId, 3));
  assert.equal(r.amount_sc_credited, 0.4);
  assert.equal(r.claims_count, 3);
  assert.equal(money(await bsc(user.userId)), 0.9);
});

test('8. missed day with resetOnMiss on: cycle restarts at Day 1, old claims stay in history', async () => {
  const user = dailyUser;
  await putSetting('daily_bonus_settings', STORE_A, dailySettings({ resetOnMiss: true }));
  const oldCampaign = await db.UserDailyBonusCampaign.findOne({ where: { userId: user.userId, status: 'active' } });

  // BASE+4 claimed? no -> BASE+5 is a missed-day gap (last claim BASE+3)
  const day = dayPlus(BASE, 5);
  const status = await atDay(day, () => getDailyBonusStatus(user.userId, { start: true }));
  assert.equal(status.campaign.claims_count, 0, 'new cycle after the missed day');
  assert.equal(status.campaign.next_day_index, 1);
  assert.notEqual(status.campaign.id, oldCampaign.id);

  await atDay(day, async () => {
    await rejects(claimDailyBonus(user.userId, 3), 400); // Day 3 no longer unlocked
    const r = await claimDailyBonus(user.userId, 1);
    assert.equal(r.amount_sc_credited, 0.2);
  });

  const old = await db.UserDailyBonusCampaign.findByPk(oldCampaign.id);
  assert.equal(old.status, 'expired', 'closed with an allowed status (CHECK constraint: active | completed | expired)');
  assert.ok(old.completedAt, 'closed cycles carry completed_at');
  assert.equal(await count(`SELECT count(*) AS n FROM user_daily_bonus_claims WHERE user_id = :id AND campaign_id = :c`, { id: user.userId, c: oldCampaign.id }), 3);
  assert.equal(await count(`SELECT count(*) AS n FROM user_daily_bonus_claims WHERE user_id = :id`, { id: user.userId }), 4);
  assert.equal(money(await bsc(user.userId)), 1.1);
});

test('9. day 7 completes the cycle; it stays done unless the store repeats; then it restarts at Day 1', async () => {
  const user = dailyUser;
  let expected = 1.1;
  let last;
  for (let d = 2; d <= 7; d += 1) {
    last = await atDay(dayPlus(BASE, 4 + d), () => claimDailyBonus(user.userId, d)); // consecutive days
    expected = money(expected + DAY_AMOUNTS[d - 1]);
  }
  assert.equal(last.campaign_status, 'completed');
  assert.equal(last.claims_count, 7);
  assert.equal(money(await bsc(user.userId)), expected, 'wallet equals the sum of the claimed rewards');

  const next = dayPlus(BASE, 12);
  await atDay(next, async () => {
    await rejects(claimDailyBonus(user.userId, 1), 400); // repeat is off
    await putSetting('daily_bonus_settings', STORE_A, dailySettings({ resetOnMiss: true, repeatAfterComplete: true }));
    const status = await getDailyBonusStatus(user.userId, { start: true });
    assert.equal(status.campaign.claims_count, 0);
    assert.equal(status.campaign.next_day_index, 1);
    const r = await claimDailyBonus(user.userId, 1);
    assert.equal(r.amount_sc_credited, 0.2);
    expected = money(expected + 0.2);
  });
  assert.equal(money(await bsc(user.userId)), expected);
  assert.equal(await count(`SELECT count(*) AS n FROM user_daily_bonus_claims WHERE user_id = :id`, { id: user.userId }), 11, 'all 11 claims (3 + 7 + 1) are kept');
  assert.equal(await count(`SELECT count(*) AS n FROM user_transactions WHERE user_id = :id AND type = 'daily_bonus'`, { id: user.userId }), 11);
});

/* ------------------------------ 10-12: concurrency, persistence, isolation ------------------------------ */

test('10. simultaneous claims of the same reward: exactly one succeeds', async () => {
  await putSetting('daily_bonus_settings', STORE_A, dailySettings());
  const { user } = await makePlayer(STORE_A, 'dailyrace');
  const results = await Promise.allSettled(Array.from({ length: 8 }, () => claimDailyBonus(user.userId, 1)));
  const ok = results.filter((r) => r.status === 'fulfilled');
  assert.equal(ok.length, 1, `expected exactly one success, got ${ok.length}`);
  assert.equal(money(await bsc(user.userId)), 0.2);
  assert.equal(await count(`SELECT count(*) AS n FROM user_daily_bonus_claims WHERE user_id = :id`, { id: user.userId }), 1);
  assert.equal(await count(`SELECT count(*) AS n FROM user_daily_bonus_campaigns WHERE user_id = :id`, { id: user.userId }), 1);
  raceUser = user;
});

test('11. refresh and re-login keep the reward state (state lives in the database)', async () => {
  const user = raceUser;
  const a = await getDailyBonusStatus(user.userId, { start: true });
  const b = await getDailyBonusStatus(user.userId, { start: true }); // "refresh"
  assert.equal(a.campaign.id, b.campaign.id, 'no extra campaign on refresh');
  assert.equal(b.campaign.claims_count, 1);
  assert.equal(b.claimed_today, true);

  // re-login of a registered account leaves its balance and welcome history untouched
  await login({ email: playerA.email, password: pwA, clientStoreCode: STORE_A });
  assert.equal(money(await bsc(playerA.userId)), 2);
  await login({ email: playerA.email, password: pwA, clientStoreCode: STORE_A });
  assert.equal(money(await bsc(playerA.userId)), 2);
});

test('12. store isolation: a store without daily rewards cannot claim; stores never share state', async () => {
  const { user: b } = await makePlayer(STORE_B, 'dailyoff');
  await rejects(claimDailyBonus(b.userId, 1), 403);
  const status = await getDailyBonusStatus(b.userId, { start: true });
  assert.equal(status.available, false);
  assert.equal(await bsc(b.userId), 0);
  assert.equal(await count(`SELECT count(*) AS n FROM user_daily_bonus_claims WHERE user_id = :id`, { id: b.userId }), 0);

  // every campaign/claim of store A belongs to store A users
  const foreign = await count(
    `SELECT count(*) AS n FROM user_daily_bonus_campaigns c JOIN users u ON u.user_id = c.user_id
      WHERE u.store_code = :a AND c.store_code <> :a`,
    { a: STORE_A }
  );
  assert.equal(foreign, 0);

  // store A has the feature on, yet B still cannot claim
  await rejects(claimDailyBonus(b.userId, 1), 403);
});

/* ------------------------------ 13: nothing else changed ------------------------------ */

test('13. existing data of every other store is unchanged', async () => {
  const after = await existingDataSnapshot();
  assert.deepEqual(after, beforeSnapshot, 'users, wallets, balances, transactions, daily claims and settings outside the fixture stores are identical');
});
