import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { homeConfig as defaultHomeConfig } from './homeConfig';
import { getHomePageContentConfig } from '../api/homePageContent';

/**
 * Supplies the guest home-page config to every Home2 section.
 *
 * Base = the built-in defaults in homeConfig.js. On mount we fetch the
 * admin-managed content (settings key `home_page_content`) and deep-merge it
 * over the defaults, so:
 *   - nothing saved / API down  → today's design (defaults) still renders
 *   - a field left out by admin  → falls back to its default
 *   - an array set by admin      → replaces the default array wholesale
 *
 * Sections read it with `useHomeConfig()`. The provider renders defaults
 * immediately (no loading flash) and swaps in merged content when it arrives.
 */
const HomeConfigContext = createContext(defaultHomeConfig);

function isPlainObject(v) {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

/** Admin value wins when present; missing keys keep the default; arrays replace. */
function deepMerge(base, override) {
  if (!isPlainObject(override)) return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const key of Object.keys(override)) {
    const o = override[key];
    if (o === undefined) continue;
    if (isPlainObject(o) && isPlainObject(out[key])) {
      out[key] = deepMerge(out[key], o);
    } else {
      out[key] = o;
    }
  }
  return out;
}

export function HomeConfigProvider({ children }) {
  const [content, setContent] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getHomePageContentConfig()
      .then((data) => {
        if (!cancelled && data && typeof data === 'object') setContent(data);
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => {
    if (!content || Object.keys(content).length === 0) return defaultHomeConfig;
    return deepMerge(defaultHomeConfig, content);
  }, [content]);

  return <HomeConfigContext.Provider value={value}>{children}</HomeConfigContext.Provider>;
}

export function useHomeConfig() {
  return useContext(HomeConfigContext);
}

export default HomeConfigContext;
