import { useEffect, useState } from 'react';
import { getFooterContentConfig } from '../api/footerContent';
import { defaultFooterConfig, mergeFooterConfig } from '../config/footerConfig';
import { STORE_CODE } from '../config/site';

// The footer is mounted on nearly every route, so share one fetch between mounts
// and re-use it for a short while instead of calling the API on each navigation.
const CACHE_MS = 60 * 1000;
let cache = { at: 0, config: defaultFooterConfig, pending: null };

function loadFooterConfig() {
  if (Date.now() - cache.at < CACHE_MS) return Promise.resolve(cache.config);
  if (cache.pending) return cache.pending;
  cache.pending = getFooterContentConfig(STORE_CODE)
    .then((saved) => mergeFooterConfig(saved))
    .catch(() => defaultFooterConfig) // API down: keep the built-in footer
    .then((config) => {
      cache = { at: Date.now(), config, pending: null };
      return config;
    });
  return cache.pending;
}

/** Footer content: admin-managed values over the built-in defaults (defaults until loaded). */
export function useFooterContent() {
  const [config, setConfig] = useState(cache.config);

  useEffect(() => {
    let cancelled = false;
    loadFooterConfig().then((c) => {
      if (!cancelled) setConfig(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}
