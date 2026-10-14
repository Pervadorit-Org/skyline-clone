import { useEffect, useState } from 'react';
import { getGamePages } from '../api/gamePages';
import { IS_BRAND_STORE } from '../config/site';

const ENABLED = IS_BRAND_STORE;

// One request shared by the footer and the home page platform tiles.
let pending = null;
function loadPages() {
  if (!pending) {
    pending = getGamePages()
      .then((res) => (Array.isArray(res?.game_pages) ? res.game_pages : []))
      .catch(() => {
        pending = null;
        throw new Error('game pages unavailable');
      });
  }
  return pending;
}

/**
 * Active platform pages (Admin → Footer links → game pages), with their image.
 * `loaded` turns true once the request finished (also when it failed → empty list).
 */
export function useGamePageList() {
  const [state, setState] = useState({ loaded: !ENABLED, pages: [] });

  useEffect(() => {
    if (!ENABLED) return undefined;
    let cancelled = false;
    loadPages()
      .then((list) => {
        if (cancelled) return;
        setState({
          loaded: true,
          pages: list.map((page) => ({
            to: `/platform-games/${page.slug}`,
            label: page.name,
            key: page.slug,
            image: page.image || page.imageUrl || page.defaultImage || '',
          })),
        });
      })
      .catch(() => {
        if (!cancelled) setState({ loaded: true, pages: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/** Active platform pages for the site footer. Empty when this store has no game pages. */
export function useGamePageLinks() {
  return useGamePageList().pages;
}
