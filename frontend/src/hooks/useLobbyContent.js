import { useEffect, useState } from 'react';
import { getLobbyImages } from '../api/lobbyImages';

// The lobby can mount several times (route changes), so share one fetch for a short while.
const CACHE_MS = 60 * 1000;
let cache = { at: 0, content: {}, pending: null };

function load() {
  if (Date.now() - cache.at < CACHE_MS) return Promise.resolve(cache.content);
  if (cache.pending) return cache.pending;
  cache.pending = getLobbyImages()
    .catch(() => ({})) // API down / nothing saved: the built-in artwork
    .then((content) => {
      cache = { at: Date.now(), content, pending: null };
      return content;
    });
  return cache.pending;
}

/** Backend-managed lobby images: { banners, dailyCardBg, spinCardBg } (empty until loaded or saved). */
export function useLobbyContent() {
  const [content, setContent] = useState(cache.content);
  useEffect(() => {
    let cancelled = false;
    load().then((c) => {
      if (!cancelled) setContent(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return content;
}
