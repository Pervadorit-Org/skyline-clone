import { useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { buildGuestPlatformGames } from '../../config/featuredPlatformGames';
import { GameImage } from '../Games/GameImage';
import { getGameDisplayName } from '../../utils/gameDisplay';
import { site } from '../../config/site';

const GUEST_PLATFORMS = buildGuestPlatformGames([]);
const PAGE_SIZE = 12;

export function GuestHomePlatforms({
  eyebrow = 'Also on your account',
  title = 'TRY OTHER GAMES',
  subtitle = (
    <>
      {site.platformName} is the main event. One <strong>{site.platformName}</strong> account also opens
      these web platforms.
    </>
  ),
  limit = null,
  items = null,
  pages = null,
}) {
  const navigate = useNavigate();
  const { search } = useLocation();
  const signupTo = `/register${search || ''}`;
  const [visiblePages, setVisiblePages] = useState(1);

  // Admin-managed tiles (home_page_content.platforms.items) override the
  // built-in curated list when present; otherwise keep the default platforms.
  // Managed platform pages (same list as the footer) come first; each tile opens its own page.
  const basePlatforms =
    Array.isArray(pages) && pages.length
      ? pages.map((p) => ({
          id: `page-${p.key}`,
          name: p.label,
          image_url: p.image,
          imageUrl: p.image,
          to: p.to,
        }))
      : Array.isArray(items) && items.length
      ? items.map((it, i) => ({
          id: `cfg-${i}`,
          name: it?.name || '',
          image_url: it?.image || '',
          imageUrl: it?.image || '',
          isNew: Boolean(it?.isNew),
        }))
      : GUEST_PLATFORMS;

  const source = limit ? basePlatforms.slice(0, limit) : basePlatforms;
  const total = source.length;
  const visibleCount = limit ? total : Math.min(total, PAGE_SIZE * visiblePages);
  const visibleGames = source.slice(0, visibleCount);
  const remaining = limit ? 0 : Math.max(0, total - visibleCount);

  const goSignup = useCallback(() => {
    navigate(signupTo);
  }, [navigate, signupTo]);

  // Site paths use the router; full URLs open in a new tab.
  const openTile = (to) => {
    if (/^https?:\/\//i.test(to)) window.open(to, '_blank', 'noopener,noreferrer');
    else navigate(to);
  };

  return (
    <section className="df-other-games" id="games" aria-labelledby="df-other-games-title">
      {eyebrow ? <p className="df-games-eyebrow">{eyebrow}</p> : null}
      <h2 className="df-games-title" id="df-other-games-title">
        {title}
      </h2>
      {subtitle ? <p className="df-games-sub">{subtitle}</p> : null}

      <ul className="df-other-games__list">
        {visibleGames.map((game, index) => {
          const name = getGameDisplayName(game);
          return (
            <li key={game.id ?? `${name}-${index}`}>
              <button
                type="button"
                className="df-other-games__tile"
                aria-label={game.to ? `Open ${name}` : `${name} (secondary platform)`}
                onClick={() => (game.to ? openTile(game.to) : goSignup())}
              >
                <span className="df-other-games__ring">
                  {game.isNew ? <span className="df-other-games__new">NEW</span> : null}
                  <GameImage
                    game={game}
                    className="df-other-games__art"
                    fetchPriority={index < 8 ? 'high' : 'auto'}
                    width={112}
                    height={151}
                  />
                </span>
                <span className="df-other-games__name">{name}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {remaining > 0 ? (
        <div className="df-games-more df-games-more--toggle">
          <button
            className="df-games-view-more"
            type="button"
            onClick={() => setVisiblePages((n) => n + 1)}
          >
            VIEW MORE
          </button>
        </div>
      ) : null}
    </section>
  );
}
