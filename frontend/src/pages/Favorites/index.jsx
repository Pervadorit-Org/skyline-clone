import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as gamesApi from '../../api/games';
import { STORE_CODE } from '../../config/site';
import { usePageContentReady } from '../../context/PageReadyContext';
import { getAllCachedProviderSlotGames } from '../../utils/dashboardSlotGamesCache';
import { useLaunchDashboardSlotGame } from '../../hooks/useLaunchDashboardSlotGame';
import { DepositRequiredModal } from '../../components/Games/DepositRequiredModal';
import { GameImage } from '../../components/Games/GameImage';
import { GameFavoriteButton } from '../../components/Home/GameFavoriteButton';
import { getGameDisplayName } from '../../utils/gameDisplay';
import {
  favoriteUserId,
  platformFavoriteId,
  slotFavoriteId,
  useGameFavorites,
} from '../../utils/gameFavorites';
import './favorites-page.css';

export function Favorites() {
  const { user } = useAuth();
  const userId = favoriteUserId(user);
  const { ids } = useGameFavorites(userId);
  const [query, setQuery] = useState('');
  const [platformGames, setPlatformGames] = useState([]);
  const [slotGames, setSlotGames] = useState(() => getAllCachedProviderSlotGames());
  const {
    handlePlayGame,
    launchingGameId,
    depositRequiredModalOpen,
    closeDepositRequiredModal,
    activationBonusType,
  } = useLaunchDashboardSlotGame();

  usePageContentReady(true);

  useEffect(() => {
    let cancelled = false;
    gamesApi
      .listGames({ store_code: STORE_CODE })
      .then((res) => {
        if (!cancelled) setPlatformGames(res?.games ?? []);
      })
      .catch(() => {});
    const refresh = () => setSlotGames(getAllCachedProviderSlotGames());
    const t = window.setTimeout(refresh, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  const favorites = useMemo(() => {
    const list = [];
    platformGames.forEach((g) => {
      if (ids.includes(platformFavoriteId(g))) list.push({ kind: 'platform', game: g, id: platformFavoriteId(g), name: getGameDisplayName(g.name, g.gameKey) });
    });
    slotGames.forEach((g) => {
      if (ids.includes(slotFavoriteId(g))) list.push({ kind: 'slot', game: g, id: slotFavoriteId(g), name: g.title });
    });
    const q = query.trim().toLowerCase();
    return q ? list.filter((f) => String(f.name || '').toLowerCase().includes(q)) : list;
  }, [platformGames, slotGames, ids, query]);

  return (
    <main className="fav-page">
      <section className="fav-section">
        <h1 className="fav-title">Favorites</h1>
        <div className="fav-search">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m21 21-4.34-4.34" />
            <circle cx="11" cy="11" r="8" />
          </svg>
          <input type="search" placeholder="Search favorites" aria-label="Search favorites" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {favorites.length === 0 ? (
          <p className="fav-empty">No favorite games yet — tap the heart on any game to add it.</p>
        ) : (
          <div className="fav-grid">
            {favorites.map((f) => (
              <article key={f.id} className="fav-card">
                {f.kind === 'slot' ? (
                  <button type="button" className="fav-card-btn" disabled={launchingGameId === f.game.id} onClick={() => handlePlayGame(f.game)} aria-label={`Play ${f.name}`}>
                    <img src={f.game.image} alt={f.name} width={220} height={220} loading="lazy" />
                    <span>{f.name}</span>
                  </button>
                ) : (
                  <Link to="/casino" className="fav-card-btn" aria-label={`Open ${f.name}`}>
                    <GameImage game={f.game} className="fav-card-img" width={220} height={220} loading="lazy" />
                    <span>{f.name}</span>
                  </Link>
                )}
                <GameFavoriteButton id={f.id} name={f.name} className="df-game-card__fav" />
              </article>
            ))}
          </div>
        )}
      </section>
      <DepositRequiredModal open={depositRequiredModalOpen} onClose={closeDepositRequiredModal} activationBonusType={activationBonusType} />
    </main>
  );
}
