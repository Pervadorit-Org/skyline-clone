import { useEffect, useState } from 'react';
import { prefetchLobbySlotGames } from '../components/Home/DashboardSlotGamesSection';
import { getAllCachedProviderSlotGames } from '../utils/dashboardSlotGamesCache';
import { buildCategoryPageGames } from '../utils/gitslotparkLandingGames';

function readGames(catalogId) {
  return buildCategoryPageGames(getAllCachedProviderSlotGames(), catalogId);
}

/**
 * Games for one category page. Renders from the local catalog cache straight
 * away, then refreshes as each provider's catalog finishes loading.
 */
export function useCategoryPageGames(catalogId) {
  const [games, setGames] = useState(() => readGames(catalogId));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const apply = () => {
      if (!cancelled) setGames(readGames(catalogId));
    };
    setLoading(true);
    apply();
    prefetchLobbySlotGames(apply).finally(() => {
      if (cancelled) return;
      apply();
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [catalogId]);

  return { games, loading };
}
