import { useEffect, useState } from 'react';
import { getGameCategory } from '../config/gameCategories';
import { getAllCachedProviderSlotGames, SLOT_GAMES_CACHE_EVENT } from '../utils/dashboardSlotGamesCache';
import { buildCategoryGameIndex } from '../utils/slotLobbyGames';

function readAvailability() {
  const games = getAllCachedProviderSlotGames();
  if (!games.length) return null; // catalog not loaded yet: don't hide anything
  const index = buildCategoryGameIndex(games);
  return (catalogId) => (index.get(catalogId)?.length || 0) > 0;
}

/**
 * Which game categories actually have games. Returns `isAvailable(slugOrId)`:
 * true for categories with games, false for empty ones, and true for everything
 * until the game catalog has loaded (so nothing flickers away on first paint).
 * Reads the shared catalog cache only; it never triggers a fetch itself.
 */
export function useAvailableGameCategories() {
  const [check, setCheck] = useState(() => readAvailability());

  useEffect(() => {
    const update = () => setCheck(() => readAvailability());
    window.addEventListener(SLOT_GAMES_CACHE_EVENT, update);
    return () => window.removeEventListener(SLOT_GAMES_CACHE_EVENT, update);
  }, []);

  return (slugOrId) => {
    if (!check) return true;
    const category = getGameCategory(slugOrId);
    // Unknown ids (not a game category) are never hidden here.
    return category ? check(category.catalogId) : true;
  };
}
