'use strict';

/**
 * End-to-end test of the GC / SC flow against the LOCAL database (goldendragon store).
 *
 *   node scripts/test-gc-sc-flow.js
 *
 * Isolation:
 *  - Refuses production / non-local databases.
 *  - Creates brand-new test users (email gcsc-test-<run>-N@example.test) and only ever touches those users.
 *  - Mail + payment-account creation are switched off in this process, so no third-party API is called.
 *  - Payment *completions* are simulated by calling the same completion services the provider
 *    callbacks call (completeDepositFromSelfcrypto / processProviderTransaction / deposit).
 *  - All test rows are deleted at the end (by user id), and a before/after checksum proves that no
 *    existing customer wallet or transaction changed.
 * No schema change, no migration.
 */
require('dotenv').config({ override: true });

const http = require('http');
const crypto = require('crypto');
const { Op } = require('sequelize');

const db = require('../src/db/models');
const config = require('../src/configs/app.config');

const host = String(process.env.DB_WRITE_HOST || process.env.DB_HOST || 'localhost').trim().toLowerCase();
if ((process.env.NODE_ENV || 'development') === 'production' || !['', 'localhost', '127.0.0.1', '::1'].includes(host)) {
  console.error('Refusing to run: this test only runs against a local development database.');
  process.exit(1);
}

// No third-party side effects from this process.
config.set('jwt.emailTokenKey', '');
process.env.PAYMENT_PASSWORD_ENCRYPTION_KEY = '';
process.env.PAYMENT_PASSWORD_ENCRYPTION_KEY_FALLBACK = '';

const { register } = require('../src/services/auth/register.service');
const { getBalance } = require('../src/services/wallet/getBalance.service');
const gc = require('../src/services/wallet/gcWallet.service');
const { creditGcPackagePurchase } = require('../src/services/wallet/gcPurchase.service');
const { deposit } = require('../src/services/wallet/deposit.service');
const { completeDepositFromSelfcrypto } = require('../src/services/wallet/completeDepositFromSelfcrypto.service');
const { processProviderTransaction } = require('../src/services/wallet/depositV2Workflow.service');
const { grantWelcomeSignupBonus } = require('../src/services/wallet/grantWelcomeSignupBonus.service');
const { getPlayableBalance, applyBalanceDelta, applyRollbackDelta } = require('../src/services/gitslotpark/callbacks/gitslotparkCallbackWallet.service');
const { getGamePlayEligibility } = require('../src/services/games/gamePlayEligibility.service');
const { createAccessToken } = require('../src/helpers/authentication.helpers');
const { claimDailyBonus } = require('../src/services/dailyBonus/claimDailyBonus.service');
const { getDailyBonusStatus } = require('../src/services/dailyBonus/getDailyBonusStatus.service');
const { getTransactions } = require('../src/services/transactions/getTransactions.service');

const STORE = 'goldendragon';
const RUN = `${Date.now().toString(36)}${crypto.randomBytes(2).toString('hex')}`;
const PASSWORD = `Gc-Test-${crypto.randomBytes(4).toString('hex')}-Aa1!`;
const API = { host: 'localhost', port: Number(process.env.PORT) || 8080 };
const testUserIds = [];
const results = [];
let seq = 0;

/* ------------------------------ helpers ------------------------------ */
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail: ok ? '' : String(detail) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `  -> ${detail}`}`);
}
const near = (a, b) => Math.abs(Number(a) - Number(b)) < 0.005;

function httpJson(method, path, { token, body } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        ...API,
        method,
        path,
        headers: {
          'content-type': 'application/json',
          'x-store-code': STORE,
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(payload ? { 'content-length': Buffer.byteLength(payload) } : {})
        }
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(raw); } catch (_) { /* not json */ }
          resolve({ status: res.statusCode, json, raw });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}
const unwrap = (r) => (r.json && r.json.data !== undefined ? r.json.data : r.json);

async function newUser(storeCode = STORE, label = 'u') {
  seq += 1;
  const email = `gcsc-test-${RUN}-${label}${seq}@example.test`;
  const out = await register(
    { email, password: PASSWORD, username: `gcsc${RUN}${label}${seq}`.slice(0, 40), firstName: '', lastName: '', code: storeCode, clientStoreCode: storeCode },
    {}
  );
  const userId = out.user.userId;
  testUserIds.push(userId);
  return { userId, email, out };
}

async function walletRow(userId, code) {
  const rows = await db.Wallet.findAll({ where: { userId, currencyCode: code } });
  return { count: rows.length, balance: rows.reduce((s, w) => s + Number(w.balance), 0) };
}

async function sumTx(userId, where = {}) {
  const rows = await db.UserTransaction.findAll({ where: { userId, ...where }, raw: true });
  return { count: rows.length, sum: rows.reduce((s, r) => s + Number(r.amount), 0), rows };
}

async function firstPackage(minFreeSc) {
  const pkgs = await db.DepositPackage.findAll({ where: { storeCode: STORE, isActive: true }, order: [['sortOrder', 'ASC']] });
  return pkgs.find((p) => (minFreeSc ? Number(p.finalSc) > 0 : Number(p.finalSc) === 0)) || pkgs[0];
}

let txCounter = 0;
async function completeSelfcrypto(userId, pkg, transactionId, { createPending = true } = {}) {
  if (createPending) {
    const exists = await db.PaymentPendingDeposit.findOne({ where: { provider: 'selfcrypto', providerSessionId: transactionId } });
    if (!exists) {
      await db.PaymentPendingDeposit.create({
        userId,
        amount: Number(pkg.finalPrice),
        paymentLink: 'test://no-link',
        status: 'pending',
        provider: 'selfcrypto',
        providerSessionId: transactionId,
        providerMetadata: { packageId: pkg.id, creditAmount: Number(pkg.finalSc), payAmount: Number(pkg.finalPrice) }
      });
    }
  }
  return completeDepositFromSelfcrypto({ transactionId, userId, amount: Number(pkg.finalPrice), cryptoCurrency: 'USDT', txHash: `tx-${transactionId}` });
}

async function inTx(fn) {
  return db.sequelize.transaction(fn);
}

/* --------------------------- checksum + cleanup --------------------------- */
async function checksum() {
  const [rows] = await db.sequelize.query(`
    SELECT
      (SELECT COUNT(*) FROM wallets w JOIN users u ON u.user_id = w.user_id WHERE u.user_id NOT IN (:ids)) AS wallets_n,
      (SELECT COALESCE(SUM(w.balance),0) FROM wallets w JOIN users u ON u.user_id = w.user_id WHERE u.user_id NOT IN (:ids)) AS wallets_sum,
      (SELECT COUNT(*) FROM user_transactions t WHERE t.user_id NOT IN (:ids)) AS tx_n,
      (SELECT COALESCE(SUM(t.amount),0) FROM user_transactions t WHERE t.user_id NOT IN (:ids)) AS tx_sum,
      (SELECT COUNT(*) FROM wallet_ledger WHERE user_id NOT IN (:ids)) AS ledger_n,
      (SELECT COUNT(*) FROM deposit_requests WHERE user_id NOT IN (:ids)) AS dep_n
  `, { replacements: { ids: testUserIds.length ? testUserIds : [-1] } });
  return rows[0];
}

let tempPlainPkgId = null;

async function cleanup() {
  if (tempPlainPkgId) {
    await db.DepositPackage.destroy({ where: { id: tempPlainPkgId } }).catch(() => {});
    tempPlainPkgId = null;
  }
  if (!testUserIds.length) return;
  const ids = testUserIds;
  // every table that has a user_id column (children first by retrying until stable)
  const [tables] = await db.sequelize.query(`
    SELECT table_name FROM information_schema.columns
    WHERE table_schema='public' AND column_name='user_id' AND table_name <> 'users'`);
  let pending = tables.map((t) => t.table_name);
  for (let pass = 0; pass < 6 && pending.length; pass++) {
    const next = [];
    for (const t of pending) {
      try {
        await db.sequelize.query(`DELETE FROM "${t}" WHERE user_id = ANY(ARRAY[:ids]::int[])`, { replacements: { ids } });
      } catch (_) {
        next.push(t);
      }
    }
    pending = next;
  }
  for (const id of ids) {
    await db.sequelize.query(`DELETE FROM settings WHERE key = :key`, { replacements: { key: `wallet_currency_mode_user_${id}` } });
  }
  await db.sequelize.query(`DELETE FROM payment_deposit_completions WHERE transaction_id LIKE :p`, { replacements: { p: `gcsc-${RUN}%` } }).catch(() => {});
  try {
    await db.sequelize.query(`DELETE FROM users WHERE user_id = ANY(ARRAY[:ids]::int[]) AND email LIKE 'gcsc-test-%@example.test'`, { replacements: { ids } });
  } catch (err) {
    console.log('WARN  could not delete some test users:', err.message);
  }
}

/* --------------------------------- tests --------------------------------- */
async function main() {
  await db.sequelize.authenticate();
  const before = await checksum();
  const legacyGcBefore = (await db.sequelize.query(`SELECT COUNT(*)::int AS n FROM user_transactions t JOIN users u ON u.user_id = t.user_id WHERE t.currency_code = 'GC' AND u.store_code <> :store`, { replacements: { store: STORE }, type: db.sequelize.QueryTypes.SELECT }))[0].n;
  const pkgPaid = await firstPackage(true); // eligible for free SC
  // A package with NO free SC. The live ladder gives every package free SC, so the test owns a temporary one.
  let pkgPlain = (await db.DepositPackage.findAll({ where: { storeCode: STORE, isActive: true } })).find((p) => Number(p.finalSc) === 0 && Number(p.gcCoin) > 0);
  if (!pkgPlain) {
    pkgPlain = await db.DepositPackage.create({ groupId: pkgPaid.groupId, distributorCode: pkgPaid.distributorCode, storeCode: STORE, title: `TEST no free SC ${RUN}`, finalSc: 0, gcCoin: 25000, actualPrice: 2.99, finalPrice: 2.99, sortOrder: 9999, isActive: true });
    tempPlainPkgId = pkgPlain.id;
  }
  check('setup: goldendragon GC packages exist', pkgPaid && pkgPlain && Number(pkgPaid.gcCoin) > 0, 'seed packages first (scripts/seed-goldendragon-gc-config.js)');

  /* ---- 1. signup, welcome bonus, login ---- */
  const A = await newUser(STORE, 'a');
  check('signup creates a goldendragon user', A.out.user && A.out.user.storeCode === STORE, JSON.stringify(A.out.user && A.out.user.storeCode));
  const b0 = await getBalance(A.userId, { skipCache: true });
  check('welcome bonus: 150,000 GC credited', near(b0.balance_gc, 150000), b0.balance_gc);
  check('welcome bonus: 2 SC credited as BSC (bonus), PSC/RSC stay 0', near(b0.balance_bsc, 2) && near(b0.balance_psc, 0) && near(b0.balance_rsc, 0), JSON.stringify([b0.balance_bsc, b0.balance_psc, b0.balance_rsc]));
  check('GC and SC are separate: SC total excludes GC', near(b0.balance_sc, 2) && near(b0.balance_gc, 150000));
  check('payload flags GC store + default GC mode', b0.gc_enabled === true && b0.currency_mode === 'GC', JSON.stringify([b0.gc_enabled, b0.currency_mode]));

  const welcomeTxBefore = await sumTx(A.userId, { type: { [Op.in]: ['welcome_signup', 'welcome_signup_gc'] } });
  await grantWelcomeSignupBonus(A.userId, { clientStoreCode: STORE }).catch(() => null);
  await Promise.all([1, 2, 3, 4].map(() => grantWelcomeSignupBonus(A.userId, { clientStoreCode: STORE }).catch(() => null)));
  const b1 = await getBalance(A.userId, { skipCache: true });
  const welcomeTxAfter = await sumTx(A.userId, { type: { [Op.in]: ['welcome_signup', 'welcome_signup_gc'] } });
  check('welcome bonus credited ONCE (5 repeated/concurrent grants)', near(b1.balance_gc, 150000) && near(b1.balance_bsc, 2) && welcomeTxAfter.count === welcomeTxBefore.count && welcomeTxBefore.count === 2,
    JSON.stringify({ gc: b1.balance_gc, bsc: b1.balance_bsc, rows: welcomeTxAfter.count }));

  const login1 = await httpJson('POST', '/api/auth/login', { body: { email: A.email, password: PASSWORD, clientStoreCode: STORE } });
  const token = unwrap(login1)?.token;
  check('login (HTTP) returns a token', login1.status === 200 && !!token, `${login1.status} ${login1.raw.slice(0, 160)}`);
  const balHttp = unwrap(await httpJson('GET', '/api/wallet/balance', { token }));
  check('GET /api/wallet/balance shows GC + SC separately', near(balHttp?.balance_gc, 150000) && near(balHttp?.balance_bsc, 2), JSON.stringify(balHttp && [balHttp.balance_gc, balHttp.balance_bsc]));
  const login2 = await httpJson('POST', '/api/auth/login', { body: { email: A.email, password: PASSWORD, clientStoreCode: STORE } });
  const token2 = unwrap(login2)?.token;
  const bal2 = unwrap(await httpJson('GET', '/api/wallet/balance', { token: token2 }));
  check('returning-user login: same balances (persisted)', login2.status === 200 && near(bal2?.balance_gc, 150000) && near(bal2?.balance_bsc, 2));

  /* ---- 2. GC / SC switcher ---- */
  const modeGet = unwrap(await httpJson('GET', '/api/wallet/currency-mode', { token }));
  check('currency-mode GET defaults to GC', modeGet?.mode === 'GC' && modeGet?.gc_enabled === true, JSON.stringify(modeGet));
  const setSc = await httpJson('PUT', '/api/wallet/currency-mode', { token, body: { mode: 'SC' } });
  const afterSc = unwrap(await httpJson('GET', '/api/wallet/balance', { token }));
  check('switch to SC mode: balances unchanged, mode persisted', setSc.status === 200 && afterSc?.currency_mode === 'SC' && near(afterSc.balance_gc, 150000) && near(afterSc.balance_bsc, 2), JSON.stringify(afterSc && [afterSc.currency_mode, afterSc.balance_gc, afterSc.balance_bsc]));
  const relog = unwrap(await httpJson('POST', '/api/auth/login', { body: { email: A.email, password: PASSWORD, clientStoreCode: STORE } }));
  const afterRelog = unwrap(await httpJson('GET', '/api/wallet/balance', { token: relog?.token }));
  check('mode + both balances survive re-login', afterRelog?.currency_mode === 'SC' && near(afterRelog.balance_gc, 150000) && near(afterRelog.balance_bsc, 2));
  const bad = await httpJson('PUT', '/api/wallet/currency-mode', { token, body: { mode: 'EUR' } });
  check('invalid mode rejected (400)', bad.status === 400, bad.status);
  const noAuth = await httpJson('PUT', '/api/wallet/currency-mode', { body: { mode: 'GC' } });
  check('currency-mode requires login (401)', noAuth.status === 401, noAuth.status);
  await httpJson('PUT', '/api/wallet/currency-mode', { token, body: { mode: 'GC' } });

  /* ---- 3. gameplay uses ONLY the active balance ---- */
  await gc.setCurrencyMode(A.userId, 'GC');
  const playGc = await inTx((t) => getPlayableBalance(A.userId, t));
  check('GC mode: playable balance = GC balance only', near(playGc, 150000), playGc);
  await inTx((t) => applyBalanceDelta(A.userId, -1000, { type: 'gitslotpark_bet', description: 'test bet', metadata: { transactionId: `gcsc-${RUN}-bet1` } }, t, { betAmount: 1000 }));
  let g = await getBalance(A.userId, { skipCache: true });
  check('GC bet debits GC only (SC untouched)', near(g.balance_gc, 149000) && near(g.balance_bsc, 2) && near(g.balance_psc, 0) && near(g.balance_rsc, 0), JSON.stringify([g.balance_gc, g.balance_bsc, g.balance_rsc]));
  await inTx((t) => applyBalanceDelta(A.userId, 2500, { type: 'gitslotpark_win', description: 'test win', metadata: { transactionId: `gcsc-${RUN}-win1` } }, t));
  g = await getBalance(A.userId, { skipCache: true });
  check('GC win credits GC only: no SC / redeemable created', near(g.balance_gc, 151500) && near(g.balance_rsc, 0) && near(g.balance_bsc, 2), JSON.stringify([g.balance_gc, g.balance_rsc, g.balance_bsc]));
  let insufficient = false;
  try { await inTx((t) => applyBalanceDelta(A.userId, -999999999, { type: 'gitslotpark_bet', metadata: { transactionId: `gcsc-${RUN}-big` } }, t, { betAmount: 999999999 })); } catch (e) { insufficient = true; }
  g = await getBalance(A.userId, { skipCache: true });
  check('GC bet larger than GC balance is refused (no negative, no SC fallback)', insufficient && near(g.balance_gc, 151500) && near(g.balance_bsc, 2), JSON.stringify([insufficient, g.balance_gc, g.balance_bsc]));
  const elig = await getGamePlayEligibility(A.userId);
  check('GC mode: free play allowed without a purchase', elig.can_play_games === true, JSON.stringify(elig));

  await gc.setCurrencyMode(A.userId, 'SC');
  const playSc = await inTx((t) => getPlayableBalance(A.userId, t));
  check('SC mode: playable balance = SC buckets only (GC excluded)', near(playSc, 2), playSc);
  await inTx((t) => applyBalanceDelta(A.userId, -1, { type: 'gitslotpark_bet', metadata: { transactionId: `gcsc-${RUN}-bet2` } }, t, { betAmount: 1 }));
  g = await getBalance(A.userId, { skipCache: true });
  check('SC bet debits SC only (GC untouched)', near(g.balance_bsc, 1) && near(g.balance_gc, 151500), JSON.stringify([g.balance_bsc, g.balance_gc]));
  const eligSc = await getGamePlayEligibility(A.userId);
  check('SC mode keeps the existing deposit-to-activate rule', eligSc.can_play_games === false && eligSc.reason === 'DEPOSIT_REQUIRED', JSON.stringify(eligSc));
  let scInsufficient = false;
  try { await inTx((t) => applyBalanceDelta(A.userId, -50, { type: 'gitslotpark_bet', metadata: { transactionId: `gcsc-${RUN}-bet3` } }, t, { betAmount: 50 })); } catch (e) { scInsufficient = true; }
  g = await getBalance(A.userId, { skipCache: true });
  check('SC bet larger than SC balance is refused (GC never used as fallback)', scInsufficient && near(g.balance_gc, 151500), JSON.stringify([scInsufficient, g.balance_gc]));
  // rollback of the GC win while in SC mode must reverse GC, not SC
  await inTx((t) => applyRollbackDelta(A.userId, `gcsc-${RUN}-win1`, -2500, { type: 'gitslotpark_rollback', metadata: { transactionId: `gcsc-${RUN}-rb1` } }, t));
  g = await getBalance(A.userId, { skipCache: true });
  check('rollback reverses the wallet the bet/win used (GC), even after switching mode', near(g.balance_gc, 149000) && near(g.balance_bsc, 1), JSON.stringify([g.balance_gc, g.balance_bsc]));
  await gc.setCurrencyMode(A.userId, 'GC');

  /* ---- 3b. mid-round mode switch: the win settles in the wallet the bet used ---- */
  const rid = `round-${RUN}-a`;
  await inTx((t) => applyBalanceDelta(A.userId, -100, { type: 'gitslotpark_withdraw', metadata: { transactionId: `gcsc-${RUN}-rbet`, roundId: rid } }, t, { betAmount: 100 }));
  const mr0 = await getBalance(A.userId, { skipCache: true });
  await gc.setCurrencyMode(A.userId, 'SC'); // player toggles while the round is open
  await inTx((t) => applyBalanceDelta(A.userId, 300, { type: 'gitslotpark_deposit', metadata: { transactionId: `gcsc-${RUN}-rwin`, roundId: rid } }, t));
  const mr1 = await getBalance(A.userId, { skipCache: true });
  check('mid-round switch GC->SC: win still pays GC, SC untouched', near(mr1.balance_gc, Number(mr0.balance_gc) + 300) && near(mr1.balance_bsc, mr0.balance_bsc) && near(mr1.balance_rsc, mr0.balance_rsc), JSON.stringify([mr0.balance_gc, mr1.balance_gc, mr0.balance_bsc, mr1.balance_bsc]));
  const rid2 = `round-${RUN}-b`;
  await inTx((t) => applyBalanceDelta(A.userId, -1, { type: 'gitslotpark_withdraw', metadata: { transactionId: `gcsc-${RUN}-rbet2`, roundId: rid2 } }, t, { betAmount: 1 }));
  const mr2 = await getBalance(A.userId, { skipCache: true });
  await gc.setCurrencyMode(A.userId, 'GC'); // SC round, player switches to GC before the win
  await inTx((t) => applyBalanceDelta(A.userId, 5, { type: 'gitslotpark_deposit', metadata: { transactionId: `gcsc-${RUN}-rwin2`, roundId: rid2 } }, t));
  const mr3 = await getBalance(A.userId, { skipCache: true });
  check('mid-round switch SC->GC: win still pays SC, GC untouched', near(mr3.balance_gc, mr2.balance_gc) && near(mr3.balance_rsc, Number(mr2.balance_rsc) + 5), JSON.stringify([mr2.balance_gc, mr3.balance_gc, mr2.balance_rsc, mr3.balance_rsc]));
  await gc.setCurrencyMode(A.userId, 'GC');

  /* ---- 4. GC purchase ---- */
  const gcBefore = (await getBalance(A.userId, { skipCache: true })).balance_gc;
  const scBefore = await getBalance(A.userId, { skipCache: true });
  const txIdOk = `gcsc-${RUN}-ok-${++txCounter}`;
  const res = await completeSelfcrypto(A.userId, pkgPaid, txIdOk);
  let p = await getBalance(A.userId, { skipCache: true });
  check('successful payment credits package GC', near(p.balance_gc, Number(gcBefore) + Number(pkgPaid.gcCoin)), JSON.stringify([gcBefore, p.balance_gc, pkgPaid.gcCoin]));
  check('eligible package credits FREE promo SC to BSC (bonus), nothing to PSC', near(p.balance_bsc, Number(scBefore.balance_bsc) + Number(pkgPaid.finalSc)) && near(p.balance_psc, 0), JSON.stringify([scBefore.balance_bsc, p.balance_bsc, p.balance_psc]));
  const purchaseRows = await sumTx(A.userId, { type: { [Op.in]: ['deposit', 'gc_purchase', 'package_bonus'] } });
  const byType = Object.fromEntries(purchaseRows.rows.map((r) => [r.type, r]));
  check('history: deposit(USD) + gc_purchase(GC) + package_bonus(BSC) rows, never mixed', byType.deposit?.currencyCode === 'USD' && byType.gc_purchase?.currencyCode === 'GC' && byType.package_bonus?.currencyCode === 'BSC', JSON.stringify(purchaseRows.rows.map((r) => [r.type, r.currencyCode, r.amount])));
  const eligAfter = await getGamePlayEligibility(A.userId);
  check('purchase marks the user as having deposited', eligAfter.has_deposit === true, JSON.stringify(eligAfter));

  // package WITHOUT free SC is not eligible for a bonus
  const U = await newUser(STORE, 'b');
  const uSc0 = (await getBalance(U.userId, { skipCache: true })).balance_bsc;
  await completeSelfcrypto(U.userId, pkgPlain, `gcsc-${RUN}-plain-${++txCounter}`);
  const up = await getBalance(U.userId, { skipCache: true });
  check('package without free SC: GC credited, no promo SC', near(up.balance_gc, 150000 + Number(pkgPlain.gcCoin)) && near(up.balance_bsc, uSc0), JSON.stringify([up.balance_gc, up.balance_bsc, uSc0]));

  /* ---- 5. duplicate callbacks ---- */
  const dup1 = await completeSelfcrypto(A.userId, pkgPaid, txIdOk, { createPending: false });
  const pDup = await getBalance(A.userId, { skipCache: true });
  check('duplicate callback (same transaction id) credits nothing', near(pDup.balance_gc, p.balance_gc) && near(pDup.balance_bsc, p.balance_bsc) && (dup1.alreadyProcessed === true), JSON.stringify([pDup.balance_gc, p.balance_gc, dup1.message]));
  // bypass the completion table: the GC ledger key itself must block the second credit
  let direct = null; let directErr = null;
  try {
    direct = await deposit(A.userId, {
      amount: Number(pkgPaid.finalPrice), method: 'crypto', provider: 'selfcrypto', providerTransactionId: txIdOk,
      packageMetadata: { packageId: pkgPaid.id, payAmount: Number(pkgPaid.finalPrice), creditAmount: Number(pkgPaid.finalSc) }
    });
  } catch (e) { directErr = e; }
  const pDirect = await getBalance(A.userId, { skipCache: true });
  // Either layer may stop it: the GC ledger key (returns alreadyProcessed) or the existing unique index
  // deposit_requests.provider_transaction_id (rolls the whole transaction back). Both mean "no second credit".
  check('defence in depth: deposit() replaying the same payment id credits nothing',
    near(pDirect.balance_gc, p.balance_gc) && near(pDirect.balance_bsc, p.balance_bsc) && ((direct && direct.alreadyProcessed === true) || !!directErr),
    JSON.stringify([pDirect.balance_gc, p.balance_gc, direct && direct.alreadyProcessed, directErr && directErr.name]));
  const gcLedgerDirect = await db.WalletLedger.count({ where: { userId: A.userId, assetType: 'GC', referenceType: 'DEPOSIT_PACKAGE' } });
  check('exactly one GC purchase ledger row for that payment', gcLedgerDirect === 1, gcLedgerDirect);
  const C = await newUser(STORE, 'c');
  const txRace = `gcsc-${RUN}-race-${++txCounter}`;
  await db.PaymentPendingDeposit.create({ userId: C.userId, amount: Number(pkgPaid.finalPrice), paymentLink: 'test://x', status: 'pending', provider: 'selfcrypto', providerSessionId: txRace, providerMetadata: { packageId: pkgPaid.id, creditAmount: Number(pkgPaid.finalSc), payAmount: Number(pkgPaid.finalPrice) } });
  const race = await Promise.allSettled(Array.from({ length: 8 }, () => completeSelfcrypto(C.userId, pkgPaid, txRace, { createPending: false })));
  const cb = await getBalance(C.userId, { skipCache: true });
  const gcPurchases = await sumTx(C.userId, { type: 'gc_purchase' });
  check('8 CONCURRENT callbacks for one payment credit exactly once', near(cb.balance_gc, 150000 + Number(pkgPaid.gcCoin)) && gcPurchases.count === 1, JSON.stringify([cb.balance_gc, gcPurchases.count, race.map((r) => r.status).join(',')]));
  const wallets = await walletRow(C.userId, 'GC');
  check('only ONE GC wallet row exists after concurrent first credits', wallets.count === 1, wallets.count);

  /* ---- 6. failed / pending payments (orionstarspay path) ---- */
  const F = await newUser(STORE, 'd');
  const fBefore = await getBalance(F.userId, { skipCache: true });
  const mkOrder = (token) => db.DepositOrder.create({ userId: F.userId, provider: 'orionstarspay', requestedAmount: Number(pkgPaid.finalPrice), status: 'LINK_CREATED', paymentLinkToken: token, metadata: { packageId: pkgPaid.id, creditAmount: Number(pkgPaid.finalSc), payAmount: Number(pkgPaid.finalPrice) } });
  const tokFail = `gcsc-${RUN}-tokF`;
  await mkOrder(tokFail);
  await processProviderTransaction(F.userId, { transactionId: `gcsc-${RUN}-fail`, status: 'failed', amount: Number(pkgPaid.finalPrice), paymentLink: { token: tokFail } });
  await processProviderTransaction(F.userId, { transactionId: `gcsc-${RUN}-fail`, status: 'pending', amount: Number(pkgPaid.finalPrice), paymentLink: { token: tokFail } });
  let fb = await getBalance(F.userId, { skipCache: true });
  check('failed / pending payment credits nothing', near(fb.balance_gc, fBefore.balance_gc) && near(fb.balance_bsc, fBefore.balance_bsc), JSON.stringify([fb.balance_gc, fb.balance_bsc]));
  let noCredit = false;
  try {
    const pend = await processProviderTransaction(F.userId, { transactionId: `gcsc-${RUN}-pend2`, status: 'pending', amount: 1, paymentLink: { token: tokFail } }, { throwOnNonSuccess: true });
  } catch (e) { noCredit = true; }
  check('pending payment is reported as not confirmed', noCredit);
  const tokOk = `gcsc-${RUN}-tokOK`;
  await mkOrder(tokOk);
  await processProviderTransaction(F.userId, { transactionId: `gcsc-${RUN}-succ`, status: 'completed', amount: Number(pkgPaid.finalPrice), paymentLink: { token: tokOk } });
  fb = await getBalance(F.userId, { skipCache: true });
  check('successful orionstarspay payment credits GC + free SC', near(fb.balance_gc, Number(fBefore.balance_gc) + Number(pkgPaid.gcCoin)) && near(fb.balance_bsc, Number(fBefore.balance_bsc) + Number(pkgPaid.finalSc)) && near(fb.balance_psc, 0), JSON.stringify([fb.balance_gc, fb.balance_bsc, fb.balance_psc]));
  await Promise.all([1, 2, 3].map(() => processProviderTransaction(F.userId, { transactionId: `gcsc-${RUN}-succ`, status: 'completed', amount: Number(pkgPaid.finalPrice), paymentLink: { token: tokOk } })));
  const fb2 = await getBalance(F.userId, { skipCache: true });
  check('repeated orionstarspay callbacks do not double-credit', near(fb2.balance_gc, fb.balance_gc) && near(fb2.balance_bsc, fb.balance_bsc), JSON.stringify([fb2.balance_gc, fb.balance_gc]));

  /* ---- 7. SC can never be bought directly ---- */
  const { assertPackageRequiredForGcStore } = require('../src/services/wallet/gcPurchase.service');
  let directBlocked = false;
  try { await assertPackageRequiredForGcStore(A.userId, null); } catch (e) { directBlocked = e.statusCode === 400; }
  check('buying SC without a GC package is rejected', directBlocked);
  let noPkg = false;
  try { await inTx((t) => creditGcPackagePurchase({ userId: A.userId, packageId: null, paymentKey: `gcsc-${RUN}-nopkg`, transaction: t })); } catch (e) { noPkg = true; }
  check('payment completion without a package never credits SC/GC', noPkg);

  /* ---- 8. package catalog, admin fields ---- */
  const cat = unwrap(await httpJson('GET', '/api/deposit-packages/catalog', { token }));
  const flat = (cat?.groups || []).flatMap((x) => x.packages || []);
  check('catalog lists GC packages with gc_coin + free SC (final_sc)', flat.length >= 5 && flat.every((x) => x.gc_coin > 0) && flat.some((x) => x.final_sc > 0) && flat.some((x) => x.final_sc === 0), JSON.stringify(flat.slice(0, 2)));

  /* ---- 9. withdrawal rules ---- */
  const gcOnly = await getBalance(U.userId, { skipCache: true });
  check('GC is never withdrawable: available_to_withdraw_sc counts redeemable SC only', near(gcOnly.available_to_withdraw_sc, 0) && Number(gcOnly.balance_gc) > 0, JSON.stringify([gcOnly.available_to_withdraw_sc, gcOnly.balance_gc]));
  const wr = await httpJson('POST', '/api/wallet/withdraw', { token: unwrap(await httpJson('POST', '/api/auth/login', { body: { email: U.email, password: PASSWORD, clientStoreCode: STORE } }))?.token, body: { amount: 10 } });
  const g2 = await getBalance(U.userId, { skipCache: true });
  check('withdraw request with only GC is refused and GC is untouched', wr.status >= 400 && near(g2.balance_gc, gcOnly.balance_gc), `${wr.status} ${wr.raw.slice(0, 140)}`);
  // earn redeemable SC through SC-mode play, then it shows as withdrawable
  await gc.setCurrencyMode(U.userId, 'SC');
  await inTx((t) => applyBalanceDelta(U.userId, 5, { type: 'gitslotpark_win', metadata: { transactionId: `gcsc-${RUN}-scwin` } }, t));
  const earned = await getBalance(U.userId, { skipCache: true });
  check('SC-mode wins become redeemable SC (withdrawable); GC unchanged', near(earned.balance_rsc, 5) && near(earned.available_to_withdraw_sc, 5) && near(earned.balance_gc, gcOnly.balance_gc), JSON.stringify([earned.balance_rsc, earned.available_to_withdraw_sc, earned.balance_gc]));

  /* ---- 10. daily rewards: schedule, one claim/day, streak, missed-day reset ---- */
  const D = await newUser(STORE, 'e');
  const dStart = await getBalance(D.userId, { skipCache: true });
  const status = await getDailyBonusStatus(D.userId, { start: true });
  const sched = (status.days || []).map((d) => [d.dayIndex, d.gcAmount, Number(d.amountSc)].join(':')).join(' ');
  check('daily schedule = reference 7-day cycle (GC + SC per day)', sched === '1:20000:0 2:5000:0 3:15000:0.5 4:20000:0 5:25000:1 6:30000:0 7:100000:0.5', sched);
  const c1 = await claimDailyBonus(D.userId, 1);
  let d1 = await getBalance(D.userId, { skipCache: true });
  check('day 1 claim credits 20,000 GC (no SC)', near(d1.balance_gc, dStart.balance_gc + 20000) && near(d1.balance_bsc, dStart.balance_bsc) && c1.amount_gc_credited === 20000, JSON.stringify([d1.balance_gc, c1.amount_gc_credited]));
  let secondErr = null;
  try { await claimDailyBonus(D.userId, 1); } catch (e) { secondErr = e; }
  const dupClaim = await Promise.allSettled([claimDailyBonus(D.userId, 2), claimDailyBonus(D.userId, 2), claimDailyBonus(D.userId, 1)]);
  d1 = await getBalance(D.userId, { skipCache: true });
  check('second claim the same day is refused (also 3 concurrent attempts)', !!secondErr && near(d1.balance_gc, dStart.balance_gc + 20000) && dupClaim.every((r) => r.status === 'rejected'), JSON.stringify([secondErr && secondErr.message, d1.balance_gc]));

  const shiftBack = async (userId) => {
    const claims = await db.UserDailyBonusClaim.findAll({ where: { userId }, order: [['claimedOn', 'ASC']] });
    for (const c of claims) {
      const d = new Date(`${String(c.claimedOn).slice(0, 10)}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 1);
      await db.sequelize.query(`UPDATE user_daily_bonus_claims SET claimed_on = :d WHERE id = :id`, { replacements: { d: d.toISOString().slice(0, 10), id: c.id } });
    }
    const camps = await db.UserDailyBonusCampaign.findAll({ where: { userId } });
    for (const c of camps) {
      const d = new Date(`${String(c.startedOn).slice(0, 10)}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 1);
      await db.sequelize.query(`UPDATE user_daily_bonus_campaigns SET started_on = :d WHERE id = :id`, { replacements: { d: d.toISOString().slice(0, 10), id: c.id } });
    }
  };
  const expectGc = [20000, 5000, 15000, 20000, 25000, 30000, 100000];
  const expectSc = [0, 0, 0.5, 0, 1, 0, 0.5];
  let streakOk = true; let streakDetail = [];
  for (let day = 2; day <= 7; day++) {
    await shiftBack(D.userId);
    const b = await getBalance(D.userId, { skipCache: true });
    const c = await claimDailyBonus(D.userId, day);
    const a = await getBalance(D.userId, { skipCache: true });
    const okDay = near(a.balance_gc - b.balance_gc, expectGc[day - 1]) && near(a.balance_bsc - b.balance_bsc, expectSc[day - 1]);
    if (!okDay) { streakOk = false; streakDetail.push(`day${day}:${a.balance_gc - b.balance_gc}/${a.balance_bsc - b.balance_bsc}`); }
  }
  const st7 = await getDailyBonusStatus(D.userId, { start: false });
  check('7 consecutive days claimed: each day pays the scheduled GC + SC', streakOk, streakDetail.join(' '));
  check('7th claim completes the cycle', st7.permanently_done === true || st7.claimed_today === true, JSON.stringify({ done: st7.permanently_done, today: st7.claimed_today }));

  // missed-day reset
  const M = await newUser(STORE, 'f');
  await claimDailyBonus(M.userId, 1);
  await shiftBack(M.userId); await shiftBack(M.userId); // last claim is now 2 days ago = a missed day
  const mst = await getDailyBonusStatus(M.userId, { start: true });
  const day1 = (mst.days || []).find((d) => d.dayIndex === 1);
  check('missed day: cycle resets, Day 1 is claimable again', day1 && (day1.state === 'claimable' || day1.state === 'available') && !(mst.days || []).some((d) => d.state === 'claimed'), JSON.stringify((mst.days || []).map((d) => `${d.dayIndex}:${d.state}`)));
  const histRows = await db.UserDailyBonusClaim.count({ where: { userId: M.userId } });
  check('old cycle claims are kept as history (nothing deleted)', histRows === 1, histRows);

  /* ---- 11. history + persistence ---- */
  const hGc = await getTransactions(A.userId, { currency: 'GC', limit: 100 });
  const hSc = await getTransactions(A.userId, { currency: 'SC', limit: 100 });
  const gcCur = new Set((hGc.transactions || []).map((x) => x.currency_code));
  const scCur = new Set((hSc.transactions || []).map((x) => x.currency_code));
  check('history GC view contains only GC rows', (hGc.transactions || []).length > 0 && [...gcCur].every((c) => c === 'GC'), JSON.stringify([...gcCur]));
  check('history SC view contains no GC rows', [...scCur].every((c) => c !== 'GC') && (hSc.transactions || []).length > 0, JSON.stringify([...scCur]));
  const hHttp = unwrap(await httpJson('GET', '/api/transactions?currency=GC&limit=50', { token }));
  check('GET /api/transactions?currency=GC (HTTP)', (hHttp?.transactions || []).every((x) => x.currency_code === 'GC') && (hHttp?.transactions || []).length > 0, JSON.stringify(hHttp && hHttp.transactions && hHttp.transactions.slice(0, 2)));

  /* ---- 12. concurrency on balances ---- */
  const K = await newUser(STORE, 'g');
  await gc.setCurrencyMode(K.userId, 'GC');
  const kStart = (await getBalance(K.userId, { skipCache: true })).balance_gc; // 150000
  const bets = await Promise.allSettled(Array.from({ length: 30 }, (_, i) => inTx((t) => applyBalanceDelta(K.userId, -5000, { type: 'gitslotpark_bet', metadata: { transactionId: `gcsc-${RUN}-k${i}` } }, t, { betAmount: 5000 }))));
  const okBets = bets.filter((r) => r.status === 'fulfilled').length;
  const kAfterBets = (await getBalance(K.userId, { skipCache: true })).balance_gc;
  check('30 concurrent GC bets of 5,000 against 150,000: balance exact, never negative', near(kAfterBets, Number(kStart) - okBets * 5000) && kAfterBets >= 0 && okBets === 30, JSON.stringify([kStart, kAfterBets, okBets]));
  await inTx((t) => gc.creditGc(K.userId, 100000, { transaction: t, type: 'gc_credit', idempotencyKey: `gcsc-${RUN}-refill` }));
  const kEnd = (await getBalance(K.userId, { skipCache: true })).balance_gc;
  const over = await Promise.allSettled(Array.from({ length: 10 }, (_, i) => inTx((t) => applyBalanceDelta(K.userId, -(Number(kEnd) / 4), { type: 'gitslotpark_bet', metadata: { transactionId: `gcsc-${RUN}-o${i}` } }, t, { betAmount: Number(kEnd) / 4 }))));
  const kEnd2 = (await getBalance(K.userId, { skipCache: true })).balance_gc;
  const okOver = over.filter((r) => r.status === 'fulfilled').length;
  check('10 concurrent bets of 25% of balance: at most 4 succeed, balance never negative', okOver <= 4 && kEnd2 >= -0.001 && near(kEnd2, Number(kEnd) - okOver * (Number(kEnd) / 4)), JSON.stringify([kEnd, kEnd2, okOver]));
  const credits = await Promise.all(Array.from({ length: 12 }, (_, i) => inTx((t) => gc.creditGc(K.userId, 10, { transaction: t, type: 'gc_credit', idempotencyKey: `gcsc-${RUN}-cr${i % 4}` }))));
  const kEnd3 = (await getBalance(K.userId, { skipCache: true })).balance_gc;
  check('12 concurrent credits over 4 idempotency keys credit exactly 4 times', near(kEnd3, Number(kEnd2) + 40), JSON.stringify([kEnd2, kEnd3]));

  /* ---- 13. other stores unaffected ---- */
  const O = await newUser('playjuwa', 'o');
  const oBal = await getBalance(O.userId, { skipCache: true });
  check('non-GC store: balance payload has no GC and mode is SC', oBal.gc_enabled === false && oBal.currency_mode === 'SC' && oBal.balance_gc === undefined, JSON.stringify([oBal.gc_enabled, oBal.currency_mode, oBal.balance_gc]));
  let rejected = false;
  try { await gc.setCurrencyMode(O.userId, 'GC'); } catch (e) { rejected = e.statusCode === 400; }
  check('non-GC store cannot switch to GC', rejected);
  const oGcWallet = await walletRow(O.userId, 'GC');
  check('non-GC store user has no GC wallet row', oGcWallet.count === 0, oGcWallet.count);
  const oPkg = await db.DepositPackage.findOne({ where: { storeCode: 'playjuwa', isActive: true, finalSc: { [Op.gt]: 0 } }, order: [['id', 'ASC']] });
  if (oPkg) {
    const oBefore = await getBalance(O.userId, { skipCache: true });
    await deposit(O.userId, { amount: Number(oPkg.finalPrice), creditAmount: Number(oPkg.finalSc), method: 'crypto', provider: 'selfcrypto', providerTransactionId: `gcsc-${RUN}-other`, packageMetadata: { packageId: oPkg.id, payAmount: Number(oPkg.finalPrice), creditAmount: Number(oPkg.finalSc) } });
    const oAfter = await getBalance(O.userId, { skipCache: true });
    check('non-GC store purchase still credits SC (PSC) exactly as before', near(oAfter.balance_psc - oBefore.balance_psc, Math.min(Number(oPkg.finalSc), Number(oPkg.finalPrice))) && (await walletRow(O.userId, 'GC')).count === 0, JSON.stringify([oBefore.balance_psc, oAfter.balance_psc, oPkg.finalSc, oPkg.finalPrice]));
  } else {
    check('non-GC store purchase unchanged (skipped: no playjuwa package found)', true);
  }
  const crossStore = await db.sequelize.query(`
    SELECT COUNT(*)::int AS n FROM user_transactions t JOIN users u ON u.user_id = t.user_id
    WHERE t.currency_code = 'GC' AND u.store_code <> :store AND t.user_id NOT IN (:ids)`, { replacements: { store: STORE, ids: testUserIds }, type: db.sequelize.QueryTypes.SELECT });
  check('this run created no GC transaction for any non-goldendragon user (legacy rows untouched)', crossStore[0].n === legacyGcBefore, JSON.stringify({ now: crossStore[0].n, legacyGcBefore }));

  /* ---- 14. admin package controls (GC store) ---- */
  const admin = require('../src/services/depositPackages/adminDepositPackages.service');
  const { ROLES } = require('../src/constants/roles');
  const adminReq = { role: ROLES.MASTER_ADMIN };
  const scope = { distributorCode: 'casinoking', storeCode: STORE };
  const genGroup = await db.DepositPackageGroup.findOne({ where: { storeCode: STORE, groupKey: 'general' } });
  let adminErr = null;
  try { await admin.createPackage(adminReq, scope, { group_id: genGroup.id, title: 'TEST no gc', actual_price: 1, final_price: 1 }); } catch (e) { adminErr = e; }
  check('admin: a Gold Coin package without gc_coin is rejected', adminErr && adminErr.statusCode === 400, adminErr && adminErr.message);
  const made = await admin.createPackage(adminReq, scope, { group_id: genGroup.id, title: `TEST ${RUN}`, gc_coin: 12345, final_sc: 0, actual_price: 1.99, final_price: 1.99 });
  check('admin: creates a GC package (gc_coin saved, free SC defaults to 0)', Number(made.gcCoin) === 12345 && Number(made.finalSc) === 0, JSON.stringify([made.gcCoin, made.finalSc]));
  await admin.updatePackage(adminReq, scope, made.id, { gc_coin: 23456, final_sc: 3 });
  await made.reload();
  check('admin: edits GC and free-SC amounts', Number(made.gcCoin) === 23456 && Number(made.finalSc) === 3, JSON.stringify([made.gcCoin, made.finalSc]));
  const adminCat = await require('../src/services/depositPackages/getDepositPackagesCatalog.service').getAdminCatalogForScope(scope);
  check('admin catalog flags the store as a Gold Coin store', adminCat.gc_store === true);

  /* ---- admin: give / take Gold Coins on a player ---- */
  const adminSvc = require('../src/services/adminUsers/adminWalletDeduct.service');
  const ag0 = await getBalance(A.userId, { skipCache: true });
  await adminSvc.adminAddSc({ targetUserId: A.userId, adminUserId: null, gcAmount: 1234, description: 'test admin gc credit' });
  const ag1 = await getBalance(A.userId, { skipCache: true });
  check('admin: give GC credits GC only', near(ag1.balance_gc, Number(ag0.balance_gc) + 1234) && near(ag1.balance_bsc, ag0.balance_bsc) && near(ag1.balance_psc, ag0.balance_psc) && near(ag1.balance_rsc, ag0.balance_rsc), JSON.stringify([ag0.balance_gc, ag1.balance_gc]));
  await adminSvc.adminDeductWallets({ targetUserId: A.userId, adminUserId: null, gcAmount: 200, reason: 'test admin gc take' });
  const ag2 = await getBalance(A.userId, { skipCache: true });
  check('admin: take GC debits GC only', near(ag2.balance_gc, Number(ag1.balance_gc) - 200) && near(ag2.balance_bsc, ag1.balance_bsc), JSON.stringify([ag1.balance_gc, ag2.balance_gc]));
  let overTake = false;
  try { await adminSvc.adminDeductWallets({ targetUserId: A.userId, adminUserId: null, gcAmount: 999999999, reason: 'x' }); } catch (e) { overTake = e.statusCode === 400; }
  const ag3 = await getBalance(A.userId, { skipCache: true });
  check('admin: cannot take more GC than the player has', overTake && near(ag3.balance_gc, ag2.balance_gc));
  const adminRows = await db.UserTransaction.findAll({ where: { userId: A.userId, currencyCode: 'GC', type: ['admin_add', 'admin_deduct'] }, raw: true });
  check('admin: GC adjustments appear in history as admin_add / admin_deduct (GC)', adminRows.length === 2 && adminRows.some((r) => r.type === 'admin_add') && adminRows.some((r) => r.type === 'admin_deduct'), JSON.stringify(adminRows.map((r) => [r.type, r.amount])));
  let nonGcBlocked = false;
  try { await adminSvc.adminAddSc({ targetUserId: O.userId, adminUserId: null, gcAmount: 10, description: 'x' }); } catch (e) { nonGcBlocked = e.statusCode === 400; }
  const og = await db.Wallet.count({ where: { userId: O.userId, currencyCode: 'GC' } });
  check('admin: GC cannot be given to a non-Gold-Coin store player', nonGcBlocked && og === 0);
  const ob0 = await getBalance(O.userId, { skipCache: true });
  await adminSvc.adminAddSc({ targetUserId: O.userId, adminUserId: null, pscAmount: 3, description: 'sc still works' });
  const ob = await getBalance(O.userId, { skipCache: true });
  check('admin: normal SC adjust still works for other stores', near(ob.balance_psc, Number(ob0.balance_psc) + 3), JSON.stringify([ob0.balance_psc, ob.balance_psc]));
  const priorPackages = await db.DepositPackage.count({ where: { storeCode: STORE } });
  await db.DepositPackage.destroy({ where: { id: made.id } });
  check('admin test package removed again (seed packages untouched)', (await db.DepositPackage.count({ where: { storeCode: STORE } })) === priorPackages - 1);
  check('non-GC stores are not GC stores', gc.isGcStoreCode('playjuwa') === false && gc.isGcStoreCode('dragonfury') === false);

  /* ---- wrap up ---- */
  await cleanup();
  const after = await checksum();
  const same = JSON.stringify(before) === JSON.stringify(after);
  check('CHECKSUM: no existing customer wallet / transaction / ledger / deposit row changed', same, JSON.stringify({ before, after }));
  const left = await db.User.count({ where: { userId: { [Op.in]: testUserIds } } });
  check('all test users and their rows were removed', left === 0, left);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  await db.sequelize.close();
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (err) => {
  console.error('TEST RUN ABORTED:', err);
  try { await cleanup(); } catch (e) { console.error('cleanup failed', e.message); }
  try { await db.sequelize.close(); } catch (_) { /* ignore */ }
  process.exit(2);
});
