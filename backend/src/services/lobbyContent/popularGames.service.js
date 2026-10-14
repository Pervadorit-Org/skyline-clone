'use strict';

/**
 * Most-played games, ranked from real play history that already exists in the database
 * (gitslotpark_transactions + one_game_hub_transactions). Read-only: no table, no column, no write.
 *
 * Ranking: distinct players first, then number of plays. A store with little history of its own is
 * topped up from the other stores that share the same game providers.
 */
const { QueryTypes } = require('sequelize');
const db = require('../../db/models');

const CACHE_MS = 10 * 60 * 1000;
const MIN_OWN_GAMES = 10;
const LIMIT = 100;
const cache = new Map();

const SQL = `
  SELECT game_id AS id, SUM(plays)::int AS plays, SUM(players)::int AS players FROM (
    SELECT t.game_id::text AS game_id, COUNT(*) AS plays, COUNT(DISTINCT t.user_id) AS players
    FROM gitslotpark_transactions t
    JOIN users u ON u.user_id = t.user_id
    WHERE t.operation = 'betwin' AND t.status = 'completed' AND t.game_id IS NOT NULL
      AND t.created_at >= NOW() - (:days * INTERVAL '1 day')
      AND (:everyStore OR u.store_code ILIKE :store)
    GROUP BY t.game_id
    UNION ALL
    SELECT o.game_id::text, COUNT(*), COUNT(DISTINCT o.user_id)
    FROM one_game_hub_transactions o
    WHERE o.operation = 'bet' AND o.status = 'completed' AND o.game_id IS NOT NULL
      AND o.created_at >= NOW() - (:days * INTERVAL '1 day')
      AND (:everyStore OR o.store_code ILIKE :store)
    GROUP BY o.game_id
  ) x
  GROUP BY game_id
  ORDER BY SUM(players) DESC, SUM(plays) DESC
  LIMIT :limit
`;

async function rank(store, days, everyStore) {
  try {
    return await db.sequelize.query(SQL, {
      replacements: { store: store || '', days, everyStore, limit: LIMIT },
      type: QueryTypes.SELECT,
    });
  } catch (err) {
    // A table may not exist on a fresh database: no ranking, the lobby keeps the game-list order.
    if (/does not exist/i.test(String(err?.message))) return [];
    throw err;
  }
}

/** [{ id, plays, players }] best first, plus where the ranking came from. */
async function getPopularGames({ storeCode, days = 30 } = {}) {
  const store = String(storeCode || '').trim();
  const d = Math.min(365, Math.max(1, Math.round(Number(days)) || 30));
  const key = `${store.toLowerCase()}|${d}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  let games = store ? await rank(store, d, false) : [];
  let source = 'store';
  if (games.length < MIN_OWN_GAMES) {
    const seen = new Set(games.map((g) => g.id));
    const shared = (await rank('', d, true)).filter((g) => !seen.has(g.id));
    games = [...games, ...shared].slice(0, LIMIT);
    source = store && games.length && seen.size ? 'store+shared' : 'shared';
  }
  const value = { games, source, days: d };
  cache.set(key, { at: Date.now(), value });
  return value;
}

module.exports = { getPopularGames };
