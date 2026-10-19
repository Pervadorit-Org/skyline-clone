import { useCallback, useEffect, useState } from 'react';
import { getFavoriteGameIds, updateFavoriteGameIds } from '../api/favorites';

const EVENT = 'df-game-favorites';
const listeners = new Set();

function storageKey(userId) {
  return `dragonfury_${userId || 'local'}_favorite_games`;
}

export function favoriteUserId(user) {
  return user?.id || user?.userId || user?.email || null;
}

export function platformFavoriteId(game) {
  const id = game?.id ?? game?.gameKey ?? game?.slug ?? game?.name;
  if (id == null || id === '') return null;
  return `platform:${id}`;
}

export function slotFavoriteId(game) {
  const id = game?.id ?? game?.gameid ?? game?.gameId ?? game?.title;
  if (id == null || id === '') return null;
  return `slot:${id}`;
}

export function readFavorites(userId) {
  if (!userId || typeof localStorage === 'undefined') return [];
  try {
    const list = JSON.parse(localStorage.getItem(storageKey(userId)) || '[]');
    return Array.isArray(list) ? list.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeFavorites(userId, ids) {
  localStorage.setItem(storageKey(userId), JSON.stringify(ids));
  listeners.forEach((fn) => fn());
  window.dispatchEvent(new CustomEvent(EVENT));
}

function syncedKey(userId) {
  return `${storageKey(userId)}_synced`;
}

/**
 * Favorites live on the server so every device shows the same list; localStorage is only a cache.
 * First sync on a device merges its old local-only favorites into the server list; after that the
 * server list is the source of truth (so a removal on one device is not undone by another).
 */
const syncing = new Map();
export function syncFavoritesFromServer(userId) {
  if (!userId || typeof localStorage === 'undefined') return Promise.resolve();
  if (syncing.has(userId)) return syncing.get(userId);
  const job = (async () => {
    try {
      const server = await getFavoriteGameIds();
      const local = readFavorites(userId);
      const firstSync = localStorage.getItem(syncedKey(userId)) !== '1';
      let next = server;
      if (firstSync) {
        const localOnly = local.filter((id) => !server.includes(id));
        if (localOnly.length) next = await updateFavoriteGameIds({ add: localOnly });
        localStorage.setItem(syncedKey(userId), '1');
      }
      if (JSON.stringify(next) !== JSON.stringify(local)) writeFavorites(userId, next);
    } catch {
      /* offline or signed out: keep using the local cache */
    }
  })();
  syncing.set(userId, job);
  return job;
}

function pushChange(userId, change) {
  updateFavoriteGameIds(change).catch(() => {
    /* the local cache already has the change; the server catches up on the next toggle */
  });
}

/** @returns {boolean} true when the game was added */
export function toggleFavorite(userId, id) {
  if (!userId || !id) return false;
  const current = readFavorites(userId);
  const has = current.includes(id);
  writeFavorites(userId, has ? current.filter((item) => item !== id) : [...current, id]);
  pushChange(userId, has ? { remove: [id] } : { add: [id] });
  return !has;
}

export function useGameFavorites(userId) {
  const [ids, setIds] = useState(() => readFavorites(userId));

  useEffect(() => {
    const sync = () => setIds(readFavorites(userId));
    sync();
    syncFavoritesFromServer(userId);
    listeners.add(sync);
    const onStorage = (event) => {
      if (!event.key || event.key === storageKey(userId)) sync();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(sync);
      window.removeEventListener('storage', onStorage);
    };
  }, [userId]);

  const isFavorite = useCallback((id) => Boolean(id && ids.includes(id)), [ids]);
  const toggle = useCallback((id) => toggleFavorite(userId, id), [userId]);

  return { ids, isFavorite, toggle };
}
