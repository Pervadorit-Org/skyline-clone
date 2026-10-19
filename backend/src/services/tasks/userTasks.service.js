'use strict';

const db = require('../../db/models');
const { BONUS_CURRENCY_CODE } = require('../wallet/getCurrencySetting.service');
const { creditBonusSc } = require('../wallet/walletBuckets.service');
const { creditGc, isGcStoreUser } = require('../wallet/gcWallet.service');
const lobbyService = require('../lobbyContent');

const TX_SC = 'task_reward';
const TX_GC = 'task_reward_gc';
const DAILY_PURCHASE_MIN_USD = 30;
const DAILY_PLAY_ROUNDS = 5;

/**
 * Built-in tasks. Mirrors the defaults in the frontend TaskListModal; a store's admin-managed
 * lobby `tasks` replace a whole group, exactly like the frontend does.
 */
const DEFAULT_TASKS = {
  regular: [
    { id: 'fb', kind: 'link', gc: 1000, sc: 0.2 },
    { id: 'x', kind: 'link', gc: 10000, sc: 0.2 },
    { id: 'phone', kind: 'phone', gc: 10000, sc: 0.5 },
    { id: 'ig', kind: 'link', gc: 10000, sc: 0.2 },
    { id: 'dc', kind: 'link', gc: 10000, sc: 0.2 },
    { id: 'email', kind: 'email', gc: 100, sc: 1 }
  ],
  daily: [
    { id: 'purchase', kind: 'purchase', gc: 50000, sc: 1 },
    { id: 'referral', kind: 'referral', gc: 10000, sc: 0.5 },
    { id: 'active', kind: 'active', gc: 1000, sc: 0.1 },
    { id: 'play', kind: 'play', gc: 2500, sc: 0.25 }
  ]
};

const DAILY_KINDS = new Set(['purchase', 'referral', 'active', 'play']);

function num(v) {
  const n = Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

function utcDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function startOfUtcDay(now = new Date()) {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function nextResetAt(now = new Date()) {
  const d = startOfUtcDay(now);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

/** What has to be true for a task to be claimable, decided on the server. */
function kindOf(task, group) {
  if (task.kind) return task.kind;
  if (task.action === 'phone' || task.action === 'email') return task.action;
  if (task.url || task.social) return 'link';
  if (group === 'daily' && DAILY_KINDS.has(task.id)) return task.id;
  return 'manual';
}

async function loadTasks(user) {
  let content = {};
  try {
    const scope = user.storeCode ? await lobbyService.resolveScopeFromStoreCode(user.storeCode) : null;
    content = (await lobbyService.getLobbyContent(scope)) || {};
  } catch (_) {
    content = {};
  }
  const out = {};
  ['regular', 'daily'].forEach((group) => {
    const custom = content?.tasks?.[group];
    const list = Array.isArray(custom) && custom.length
      ? custom.filter((t) => t && t.enabled !== false)
      : DEFAULT_TASKS[group];
    out[group] = list.map((t) => ({
      id: String(t.id),
      group,
      kind: kindOf(t, group),
      sc: num(t.sc),
      gc: num(t.gc)
    }));
  });
  return out;
}

function taskKey(task, day) {
  return task.group === 'daily' ? `daily:${task.id}:${day}` : `regular:${task.id}`;
}

async function loadClaimedKeys(userId, transaction) {
  const rows = await db.sequelize.query(
    `SELECT metadata->>'task_key' AS task_key
       FROM user_transactions
      WHERE user_id = :userId AND type IN (:types) AND metadata->>'task_key' IS NOT NULL`,
    { replacements: { userId, types: [TX_SC, TX_GC] }, type: db.sequelize.QueryTypes.SELECT, transaction }
  );
  return new Set(rows.map((r) => r.task_key));
}

async function purchasedTodayUsd(userId) {
  const total = await db.DepositRequest.sum('amount', {
    where: { userId, status: 'completed', created_at: { [db.Sequelize.Op.gte]: startOfUtcDay() } }
  });
  return Number(total) || 0;
}

async function referralsToday(userId) {
  return db.User.count({
    where: { userReferredBy: userId, createdAt: { [db.Sequelize.Op.gte]: startOfUtcDay() } }
  });
}

async function playRoundsToday(userId) {
  const since = startOfUtcDay();
  // Only real bets count: wallet transfers (deposit/withdraw), rollbacks and free (0-bet) rounds do not.
  const [row] = await db.sequelize.query(
    `SELECT COUNT(DISTINCT round_id) AS n FROM (
        SELECT round_id FROM gitslotpark_transactions
         WHERE user_id = :userId AND created_at >= :since AND operation = 'betwin'
           AND status = 'completed' AND bet_amount > 0 AND round_id IS NOT NULL
        UNION ALL
        SELECT round_id FROM one_game_hub_transactions
         WHERE user_id = :userId AND created_at >= :since AND operation = 'bet'
           AND status <> 'cancelled' AND amount > 0 AND round_id IS NOT NULL
        UNION ALL
        SELECT round_id FROM scorpio_transactions
         WHERE user_id = :userId AND created_at >= :since AND command = 'bet'
           AND status = 'completed' AND amount > 0 AND round_id IS NOT NULL
     ) r`,
    { replacements: { userId, since }, type: db.sequelize.QueryTypes.SELECT }
  );
  return Number(row?.n) || 0;
}

/** True when the task's condition is currently met. Link tasks are trust-based (we cannot see a click). */
async function isEligible(task, user) {
  switch (task.kind) {
    case 'link':
    case 'active':
      return true;
    case 'phone':
      return Boolean(user.isPhoneVerified);
    case 'email':
      return Boolean(user.isEmailVerified);
    case 'purchase':
      return (await purchasedTodayUsd(user.userId)) >= DAILY_PURCHASE_MIN_USD;
    case 'referral':
      return (await referralsToday(user.userId)) >= 1;
    case 'play':
      return (await playRoundsToday(user.userId)) >= DAILY_PLAY_ROUNDS;
    default:
      return false;
  }
}

async function getUser(userId) {
  const user = await db.User.findByPk(userId, {
    attributes: ['userId', 'storeCode', 'isPhoneVerified', 'isEmailVerified']
  });
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }
  return user;
}

async function getTaskStatus(userId) {
  const user = await getUser(userId);
  const tasks = await loadTasks(user);
  const day = utcDay();
  const claimedKeys = await loadClaimedKeys(userId);
  const list = [...tasks.regular, ...tasks.daily];
  const result = await Promise.all(
    list.map(async (t) => {
      const claimed = claimedKeys.has(taskKey(t, day));
      const eligible = claimed ? true : await isEligible(t, user);
      return {
        id: t.id,
        group: t.group,
        kind: t.kind,
        reward_sc: t.sc,
        reward_gc: t.gc,
        eligible,
        claimed
      };
    })
  );
  return { tasks: result, reset_at: nextResetAt() };
}

async function getClaimedHistory(userId, limit = 50) {
  const rows = await db.UserTransaction.findAll({
    where: { userId, type: [TX_SC, TX_GC] },
    order: [['createdAt', 'DESC']],
    limit: limit * 2,
    raw: true
  });
  const byKey = new Map();
  rows.forEach((r) => {
    const key = r.metadata?.task_key;
    if (!key) return;
    const entry = byKey.get(key) || { task_key: key, task_id: r.metadata.task_id, group: r.metadata.group, claimed_at: r.createdAt, reward_sc: 0, reward_gc: 0 };
    if (r.type === TX_SC) entry.reward_sc += Number(r.amount) || 0;
    if (r.type === TX_GC) entry.reward_gc += Number(r.amount) || 0;
    byKey.set(key, entry);
  });
  return [...byKey.values()].slice(0, limit);
}

async function claimTask(userId, group, taskId) {
  if (group !== 'regular' && group !== 'daily') {
    const err = new Error('Unknown task group.');
    err.statusCode = 400;
    throw err;
  }
  const user = await getUser(userId);
  const tasks = await loadTasks(user);
  const task = tasks[group].find((t) => t.id === String(taskId));
  if (!task) {
    const err = new Error('Task not found.');
    err.statusCode = 404;
    throw err;
  }
  if (task.kind === 'manual') {
    const err = new Error('This task cannot be claimed yet.');
    err.statusCode = 400;
    throw err;
  }
  if (!(task.sc > 0 || task.gc > 0)) {
    const err = new Error('This task has no reward.');
    err.statusCode = 400;
    throw err;
  }
  if (!(await isEligible(task, user))) {
    const err = new Error('Task requirements are not met yet.');
    err.statusCode = 400;
    err.code = 'TASK_NOT_COMPLETE';
    throw err;
  }

  const day = utcDay();
  const key = taskKey(task, day);
  const gcStore = task.gc > 0 ? await isGcStoreUser(userId) : false;

  await db.sequelize.transaction(async (t) => {
    await db.sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:k))', {
      replacements: { k: `task_claim:${userId}:${key}` },
      transaction: t
    });
    if ((await loadClaimedKeys(userId, t)).has(key)) {
      const err = new Error('Reward already claimed.');
      err.statusCode = 409;
      err.code = 'TASK_ALREADY_CLAIMED';
      throw err;
    }
    const metadata = { source: 'task_list', task_key: key, task_id: task.id, group: task.group };

    if (task.sc > 0) {
      await creditBonusSc(userId, task.sc, {
        transaction: t,
        ledger: {
          eventType: 'TASK_REWARD',
          bonusType: 'TASK_REWARD',
          sourceType: 'TASK_LIST',
          sourceId: key,
          remarks: `Task reward: ${task.id}`
        }
      });
      await db.UserTransaction.create(
        {
          userId,
          type: TX_SC,
          amount: task.sc,
          currencyCode: BONUS_CURRENCY_CODE,
          description: `Task reward: ${task.sc} BSC`,
          metadata
        },
        { transaction: t }
      );
    }
    if (task.gc > 0 && gcStore) {
      await creditGc(userId, task.gc, {
        transaction: t,
        type: TX_GC,
        description: `Task reward: ${task.gc} GC`,
        metadata,
        idempotencyKey: `task_gc:${userId}:${key}`,
        reason: 'TASK_REWARD',
        referenceType: 'TASK_LIST',
        referenceId: key
      });
    }
  });

  return { task_id: task.id, group: task.group, reward_sc: task.sc, reward_gc: gcStore ? task.gc : 0 };
}

module.exports = { getTaskStatus, getClaimedHistory, claimTask };
