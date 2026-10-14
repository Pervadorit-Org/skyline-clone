import { useEffect, useState } from 'react';
import { getLobbyPopular } from '../api/lobbyContent';

// One ranking fetch per few minutes, shared by every lobby mount.
const CACHE_MS = 5 * 60 * 1000;
let cache = { at: 0, ids: [], pending: null };

function load() {
  if (Date.now() - cache.at < CACHE_MS) return Promise.resolve(cache.ids);
  if (cache.pending) return cache.pending;
  cache.pending = getLobbyPopular()
    .catch(() => []) // not available: Top 10 / Trending keep the game-list order
    .then((ids) => {
      cache = { at: Date.now(), ids, pending: null };
      return ids;
    });
  return cache.pending;
}

/** Game ids, most played first (an empty list until loaded, or when there is no play history). */
export function useLobbyPopular() {
  const [ids, setIds] = useState(cache.ids);
  useEffect(() => {
    let cancelled = false;
    load().then((v) => {
      if (!cancelled) setIds(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return ids;
}
