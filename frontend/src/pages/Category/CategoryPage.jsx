import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { GAME_CATEGORIES, getGameCategory } from '../../config/gameCategories';
import { useCategoryPageGames } from '../../hooks/useCategoryPageGames';
import { useAvailableGameCategories } from '../../hooks/useAvailableGameCategories';
import { useLaunchDashboardSlotGame } from '../../hooks/useLaunchDashboardSlotGame';
import { DepositRequiredModal } from '../../components/Games/DepositRequiredModal';
import '../../styles/category-page.css';

const PLACEHOLDER = '/logo.webp';
const SKELETON_COUNT = 12;

function gameImage(game) {
  const icons = Array.isArray(game?.iconUrls) ? game.iconUrls : [];
  return [game?.image, ...icons].find((u) => typeof u === 'string' && u.trim()) || PLACEHOLDER;
}

function GameCard({ game, onPlay, playing }) {
  const [src, setSrc] = useState(() => gameImage(game));
  const title = game.title || game.name || 'Game';
  return (
    <button
      type="button"
      className={`df-cat__card${playing ? ' is-playing' : ''}`}
      title={title}
      aria-label={`Play ${title}`}
      onClick={() => onPlay(game)}
    >
      <img src={src} alt={title} loading="lazy" draggable="false" onError={() => setSrc(PLACEHOLDER)} />
    </button>
  );
}

function CategoryStrip({ activeSlug }) {
  const activeRef = useRef(null);
  const isAvailable = useAvailableGameCategories();

  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }, [activeSlug]);

  return (
    <nav className="df-cat__strip" aria-label="Game categories">
      <div className="df-cat__strip-track">
        <Link to="/casino" className="df-cat__tab" draggable="false">
          <img src="/df-online/club-icons/gamepad.svg" alt="" width="24" height="24" />
          <span>Home</span>
        </Link>
        {GAME_CATEGORIES.filter((c) => c.slug === activeSlug || isAvailable(c.slug)).map((c) => {
          const active = c.slug === activeSlug;
          return (
            <Link
              key={c.slug}
              ref={active ? activeRef : undefined}
              to={`/category/${c.slug}`}
              className={`df-cat__tab${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              draggable="false"
            >
              <img src={c.icon} alt="" width="24" height="24" />
              <span>{c.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * /category/:slug — one game category: category strip, title, search, game grid.
 */
export function CategoryPage() {
  const { slug } = useParams();
  const category = getGameCategory(slug);
  const [search, setSearch] = useState('');
  const { games, loading } = useCategoryPageGames(category?.catalogId);
  const {
    handlePlayGame,
    launchingGameId,
    depositRequiredModalOpen,
    closeDepositRequiredModal,
    activationBonusType,
  } = useLaunchDashboardSlotGame();

  useEffect(() => {
    setSearch('');
    window.scrollTo(0, 0);
  }, [slug]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return games;
    return games.filter((g) => String(g.title || g.name || '').toLowerCase().includes(q));
  }, [games, search]);

  if (!category) return <Navigate to="/casino" replace />;
  // Old catalog ids / aliases (e.g. live-casino) redirect to the canonical slug.
  if (slug !== category.slug) return <Navigate to={`/category/${category.slug}`} replace />;

  const showSkeleton = loading && games.length === 0;

  return (
    <div className="df-cat">
      <CategoryStrip activeSlug={category.slug} />

      <div className="df-cat__body">
        <h1 className="df-cat__title">{category.label}</h1>

        <label className="df-cat__search">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m21 21-4.34-4.34" />
            <circle cx="11" cy="11" r="8" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by game name"
            aria-label="Search by game name"
          />
        </label>

        {showSkeleton ? (
          <div className="df-cat__grid" aria-busy="true" aria-label="Loading games">
            {Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <span key={i} className="df-cat__card df-cat__card--skeleton" />
            ))}
          </div>
        ) : visible.length > 0 ? (
          <div className="df-cat__grid">
            {visible.map((game, i) => (
              <GameCard
                key={game.id || game.gameid || i}
                game={game}
                onPlay={handlePlayGame}
                playing={launchingGameId != null && String(launchingGameId) === String(game.gameid)}
              />
            ))}
          </div>
        ) : (
          <p className="df-cat__empty">
            {search.trim()
              ? `No games match “${search.trim()}”.`
              : 'No games are available in this category right now.'}
          </p>
        )}
      </div>

      <DepositRequiredModal
        open={depositRequiredModalOpen}
        onClose={closeDepositRequiredModal}
        activationBonusType={activationBonusType}
      />
    </div>
  );
}

export default CategoryPage;
