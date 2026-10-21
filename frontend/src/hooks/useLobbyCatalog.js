import { useEffect, useState } from 'react';
import { prefetchLobbySlotGames } from '../components/Home/DashboardSlotGamesSection';
import { getAllCachedProviderSlotGames } from '../utils/dashboardSlotGamesCache';
import { prepareDashboardSlotGames } from '../utils/slotLobbyGames';

const POLL_MS = 1500;
const POLL_MAX_MS = 20000;

const read = () => getAllCachedProviderSlotGames();

/**
 * The playable game list for the lobby (all providers merged). Renders from the local cache straight away,
 * then refreshes as each provider's catalog (the game list API) finishes loading.
 */
export function useLobbyCatalog({ enabled = true } = {}) {
  const [games, setGames] = useState(() => (enabled ? read() : []));

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    let lastCount = -1;
    const apply = () => {
      if (cancelled) return;
      const next = read();
      if (next.length !== lastCount) {
        lastCount = next.length;
        setGames(next);
      }
    };
    apply();
    prefetchLobbySlotGames(apply).finally(apply);
    const onUpdate = () => apply();
    window.addEventListener('df-slot-catalog-updated', onUpdate);
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      apply();
      if (Date.now() - startedAt > POLL_MAX_MS) window.clearInterval(id);
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.removeEventListener('df-slot-catalog-updated', onUpdate);
      window.clearInterval(id);
    };
  }, [enabled]);

  return games;
}

export { prepareDashboardSlotGames };
