import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { casinoLobbyConfig as cfg } from '../../config/casinoLobbyConfig';
import { getGameCategoryPath } from '../../config/gameCategories';
import { useAuth } from '../../context/AuthContext';
import { useCasinoLobbyCategories } from '../Home/homeCasinoLobbyMix';
import { useLaunchDashboardSlotGame } from '../../hooks/useLaunchDashboardSlotGame';
import { DepositRequiredModal } from '../Games/DepositRequiredModal';
import { GoldenLobbySections } from './GoldenLobbySections';
import { BIG_WIN_ENTRIES } from '../Home/RecentBigWins';
import { fetchNormalizedDepositPackagesCatalog } from '../../api/depositPackages';
import { cloneGuestWinnerRows } from '../../utils/guestWinnersLeaderboard';
import '../../styles/casino-lobby.css';

const PLACEHOLDER = '/logo.webp';

function gameImage(game) {
  const icons = Array.isArray(game?.iconUrls) ? game.iconUrls : [];
  return [game?.image, ...icons].find((u) => typeof u === 'string' && u.trim()) || PLACEHOLDER;
}

function formatCoins(n) {
  const v = Number(n) || 0;
  if (v >= 1000) return `${Math.round(v / 1000)}K`;
  return String(v);
}

/* ---------- banner carousel ---------- */
function BannerSlideImage({ banner }) {
  const picture = (
    <picture>
      <source media="(max-width: 767px)" srcSet={banner.mobile} />
      <img src={banner.desktop} alt={banner.label} draggable="false" />
    </picture>
  );
  const className = 'df-lobby__banner-slide df-lobby__banner-slide--image';
  if (!banner.href) return <div className={className}>{picture}</div>;
  if (/^https?:\/\//i.test(banner.href)) {
    return (
      <a className={className} href={banner.href} target="_blank" rel="noopener noreferrer">
        {picture}
      </a>
    );
  }
  return (
    <Link className={className} to={banner.href}>
      {picture}
    </Link>
  );
}

function BannerCarousel() {
  const { isAuthenticated } = useAuth();
  const [active, setActive] = useState(0);
  // Signed-in players get the image banners; guests keep the built-in slides.
  const imageMode = isAuthenticated && cfg.imageBanners?.length > 0;
  const slides = imageMode ? cfg.imageBanners : cfg.banners;

  useEffect(() => {
    setActive(0);
  }, [imageMode]);

  useEffect(() => {
    const id = window.setInterval(() => setActive((i) => (i + 1) % slides.length), cfg.bannerIntervalMs);
    return () => window.clearInterval(id);
  }, [slides.length]);

  return (
    <section className="df-lobby__banner" aria-roledescription="carousel" aria-label="Featured offers">
      <div className="df-lobby__banner-track" style={{ transform: `translateX(-${active * 100}%)` }}>
        {slides.map((s) => imageMode ? (
          <BannerSlideImage key={s.id} banner={s} />
        ) : (
          <div
            key={s.id}
            className="df-lobby__banner-slide"
            style={{ background: `linear-gradient(105deg, ${s.from}, ${s.to})` }}
          >
            <img className="df-lobby__banner-art" src={s.art} alt="" loading="eager" draggable="false" />
            <div className="df-lobby__banner-copy">
              <p className="df-lobby__banner-kicker">{s.kicker}</p>
              <h2 className="df-lobby__banner-title">{s.title}</h2>
              <p className="df-lobby__banner-body">{s.body}</p>
              <Link to={s.href} className="df-lobby__cta">
                {s.ctaLabel}
              </Link>
            </div>
          </div>
        ))}
      </div>
      <div className="df-lobby__dots">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Slide ${i + 1}`}
            className={i === active ? 'is-active' : ''}
            onClick={() => setActive(i)}
          />
        ))}
      </div>
    </section>
  );
}

/* ---------- daily rewards / spin cards ---------- */
function PromoCards() {
  return (
    <section className="df-lobby__promos">
      {cfg.promoCards.map((c) => (
        <div
          key={c.id}
          className={`df-lobby__promo df-lobby__promo--${c.variant}`}
          style={c.bg ? { backgroundImage: `url("${c.bg}")` } : undefined}
        >
          <div className="df-lobby__promo-copy">
            <h3>{c.title}</h3>
            <Link to={c.href} className={c.variant === 'daily' ? 'df-lobby__chip' : 'df-lobby__cta df-lobby__cta--sm'}>
              {c.ctaLabel}
            </Link>
            {c.variant === 'daily' ? null : <p className="df-lobby__promo-sub">{c.subtitle}</p>}
            <p className="df-lobby__promo-note">{c.note || c.subtitle}</p>
          </div>
          {c.wheel ? (
            <div className="df-lobby__wheel" aria-hidden="true">
              <img className="df-lobby__wheel-segments" src={c.wheel.segments} alt="" loading="lazy" draggable="false" />
              <img className="df-lobby__wheel-ring" src={c.wheel.ring} alt="" loading="lazy" draggable="false" />
            </div>
          ) : c.bg ? null : (
            <img className="df-lobby__promo-art" src={c.art} alt="" loading="lazy" draggable="false" />
          )}
        </div>
      ))}
    </section>
  );
}

/* ---------- category pills ---------- */
function CategoryTabs() {
  return (
    <nav className="df-lobby__tabs" aria-label="Game categories">
      <Link to="/casino" className="df-lobby__tabs-search" aria-label="Search games">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </Link>
      {cfg.categories.map((c, i) => (
        <Link
          key={c.label}
          to={c.id ? getGameCategoryPath(c.id) : '/casino'}
          className={`df-lobby__tab${i === 0 ? ' is-active' : ''}`}
        >
          <img src={c.icon} alt="" width="16" height="16" />
          {c.label}
        </Link>
      ))}
    </nav>
  );
}

/* ---------- recent big wins marquee ---------- */
function BigWinsTicker() {
  const loop = [...BIG_WIN_ENTRIES, ...BIG_WIN_ENTRIES];
  return (
    <div className="df-lobby__wins" aria-label={cfg.recentWinsTitle}>
      <div className="df-lobby__wins-track">
        {loop.map((w, i) => (
          <div className="df-lobby__win" key={`${w.id}-${i}`} aria-hidden={i >= BIG_WIN_ENTRIES.length}>
            <img src={w.image} alt={w.name} loading="lazy" draggable="false" />
            <span>${w.amount}.00</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- section scaffolding ---------- */
function SectionHead({ title, href, icon }) {
  return (
    <header className="df-lobby__head">
      <h3>
        {icon ? <img src={icon} alt="" width="16" height="16" /> : <span className="df-lobby__head-dot" aria-hidden />}
        {title}
      </h3>
      {href ? (
        <Link to={href} className="df-lobby__viewall">
          View All
        </Link>
      ) : null}
    </header>
  );
}

function Tile({ game, onPlay, playing, className = '', style }) {
  const [src, setSrc] = useState(() => gameImage(game));
  return (
    <button
      type="button"
      className={`df-lobby__tile${playing ? ' is-playing' : ''} ${className}`.trim()}
      style={style}
      onClick={() => onPlay(game)}
      aria-label={`Play ${game.title || 'game'}`}
    >
      <img src={src} alt="" loading="lazy" draggable="false" onError={() => setSrc(PLACEHOLDER)} />
    </button>
  );
}

function CategoryRow({ category, layout, onPlay, playingId, categoryIcon, bannerArt }) {
  const limit = cfg.rowTileLimit[layout] || 18;
  const games = category.games.slice(0, limit);
  const common = { onPlay, playing: false };
  const playing = (g) => playingId != null && String(playingId) === String(g.gameid);

  let body;
  if (layout === 'grid') {
    body = (
      <div className="df-lobby__scroller df-lobby__grid3">
        {games.map((g, i) => (
          <Tile
            key={g.id || i}
            game={g}
            {...common}
            playing={playing(g)}
            className={i === 2 ? 'df-lobby__tile--feature' : ''}
          />
        ))}
      </div>
    );
  } else if (layout === 'banner') {
    const panelStyle = bannerArt
      ? { background: `linear-gradient(90deg, ${bannerArt.from}, ${bannerArt.to} 92%)` }
      : undefined;
    body = (
      <div className="df-lobby__bannerrow">
        <div className="df-lobby__bannerrow-panel" style={panelStyle}>
          {bannerArt?.art ? (
            <img src={bannerArt.art} alt="" loading="lazy" draggable="false" />
          ) : (
            <span>{category.label}</span>
          )}
        </div>
        <div className="df-lobby__scroller df-lobby__grid2">
          {games.map((g, i) => (
            <Tile key={g.id || i} game={g} {...common} playing={playing(g)} />
          ))}
        </div>
      </div>
    );
  } else if (layout === 'top10') {
    body = (
      <div className="df-lobby__scroller df-lobby__top10">
        {games.map((g, i) => (
          <div className="df-lobby__rank" key={g.id || i}>
            <span className="df-lobby__rank-num" aria-hidden>
              {i + 1}
            </span>
            <Tile game={g} {...common} playing={playing(g)} />
          </div>
        ))}
      </div>
    );
  } else {
    body = (
      <div className="df-lobby__scroller df-lobby__row">
        {games.map((g, i) => (
          <Tile key={g.id || i} game={g} {...common} playing={playing(g)} />
        ))}
      </div>
    );
  }

  return (
    <section className="df-lobby__section" aria-label={category.label}>
      <SectionHead
        title={layout === 'top10' ? `Top 10 ${category.label}` : category.label}
        href={category.href}
        icon={categoryIcon}
      />
      {body}
    </section>
  );
}

/* ---------- extra sections ---------- */
function PackagesRow() {
  const [pkgs, setPkgs] = useState([]);
  useEffect(() => {
    let off = false;
    fetchNormalizedDepositPackagesCatalog({ retries: 0 })
      .then((c) => {
        if (off) return;
        const all = (c.groups || []).flatMap((g) => g.packages || []);
        setPkgs(all.slice(0, cfg.packages.limit));
      })
      .catch(() => {});
    return () => {
      off = true;
    };
  }, []);
  if (!pkgs.length) return null;
  return (
    <section className="df-lobby__section">
      <SectionHead title={cfg.packages.title} href={cfg.packages.href} />
      <div className="df-lobby__scroller df-lobby__packages">
        {pkgs.map((p) => (
          <Link to={cfg.packages.href} className="df-lobby__pkg" key={p.id}>
            <span className="df-lobby__pkg-coins">
              <img src="/df-online/sc-coin.webp" alt="" width="16" height="16" />
              {formatCoins(p.final_sc)} SC
            </span>
            {p.discount_label ? <span className="df-lobby__pkg-badge">{p.discount_label}</span> : null}
            <span className="df-lobby__pkg-price">${Number(p.final_price).toFixed(2)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ProvidersStrip() {
  const logos = cfg.providers.logos;
  return (
    <section className="df-lobby__section df-lobby__providers">
      <h3 className="df-lobby__providers-title">{cfg.providers.title}</h3>
      <div className="df-lobby__scroller df-lobby__providers-row">
        {logos.map((p) => (
          <div className="df-lobby__provider" key={p.name}>
            <img src={p.image} alt={p.name} loading="lazy" />
          </div>
        ))}
      </div>
    </section>
  );
}

function InviteDeals() {
  const { invite, deals } = cfg;
  return (
    <section className="df-lobby__invite-deals">
      <div className="df-lobby__invite">
        <div>
          <span className="df-lobby__invite-kicker">{invite.kicker}</span>
          <h3>{invite.title}</h3>
          <p>
            {invite.body} <strong>{invite.highlight}</strong>
          </p>
          <p className="df-lobby__invite-note">{invite.note}</p>
          <Link to={invite.href} className="df-lobby__cta df-lobby__cta--sm">
            {invite.ctaLabel}
          </Link>
        </div>
        <img src={invite.art} alt="" loading="lazy" draggable="false" />
      </div>
      <div className="df-lobby__deals">
        <header>
          <h3>{deals.title}</h3>
          <Link to={deals.seeAllHref}>See All</Link>
        </header>
        <div className="df-lobby__deal">
          <div>
            <p className="df-lobby__deal-amount">
              <img src="/df-online/sc-coin.webp" alt="" width="18" height="18" />
              {deals.amount}
            </p>
            <p className="df-lobby__deal-bonus">{deals.bonus}</p>
          </div>
          <Link to={deals.ctaHref} className="df-lobby__deal-price">
            {deals.price}
          </Link>
        </div>
      </div>
    </section>
  );
}

function ExclusiveBanner() {
  const e = cfg.exclusive;
  return (
    <section className="df-lobby__section">
      <SectionHead title={e.title} />
      <Link to={e.href} className="df-lobby__exclusive">
        <p>
          {e.headline}
          <br />
          <strong>{e.highlight}</strong>
        </p>
        <img src={e.art} alt="" loading="lazy" draggable="false" />
      </Link>
    </section>
  );
}

function PickForMe({ games, onPlay }) {
  const pick = () => {
    if (!games.length) return;
    onPlay(games[Math.floor(Math.random() * games.length)]);
  };
  return (
    <section className="df-lobby__pick">
      <h3>{cfg.pick.title}</h3>
      <p>{cfg.pick.subtitle}</p>
      <button type="button" className="df-lobby__chip df-lobby__chip--lg" onClick={pick}>
        {cfg.pick.ctaLabel}
      </button>
    </section>
  );
}

function TopWinners() {
  const w = cfg.winners;
  const [showAll, setShowAll] = useState(false);
  const cols = useMemo(
    () =>
      w.columns.map((c) => {
        const rows = cloneGuestWinnerRows(c.tab);
        return { ...c, rows: [...rows.slice(c.offset), ...rows.slice(0, c.offset)] };
      }),
    [w.columns]
  );
  return (
    <section className="df-lobby__winners">
      <h2>
        {w.titleLead} <span>{w.titleHighlight}</span>
      </h2>
      <div className="df-lobby__winners-cols">
        {cols.map((c) => (
          <div key={c.id}>
            <h4>{c.label}</h4>
            <ul>
              {c.rows.slice(0, showAll ? c.rows.length : w.initialRows).map((r) => (
                <li key={r._id} className="df-lobby__winner">
                  <span className="df-lobby__winner-avatar" aria-hidden>
                    {r.avatar}
                  </span>
                  <span className="df-lobby__winner-meta">
                    <b>{r.game}</b>
                    <small>{r.prize}</small>
                  </span>
                  <Link to="/casino" className="df-lobby__winner-play">
                    ▶ Play
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {!showAll ? (
        <button type="button" className="df-lobby__chip" onClick={() => setShowAll(true)}>
          {w.showMoreLabel}
        </button>
      ) : null}
    </section>
  );
}

/* ---------- featured provider showcase (art backdrop + 2-row game strip) ---------- */
function FeaturedGameSection({ games, onPlay, playingId }) {
  const art = cfg.bannerArt[0];
  const list = games.slice(0, 20);
  const scrollerRef = useRef(null);
  const drag = useRef(null);
  if (!list.length) return null;

  const onDown = (e) => {
    const el = scrollerRef.current;
    drag.current = { x: e.clientX, left: el.scrollLeft };
  };
  const onMove = (e) => {
    if (!drag.current) return;
    scrollerRef.current.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
  };
  const onUp = () => {
    drag.current = null;
  };

  return (
    <section className="df-lobby__featured" aria-label="Featured games">
      <div
        className="df-lobby__featured-bg"
        style={{ background: `linear-gradient(105deg, ${art.from}, ${art.to} 80%)` }}
      >
        <img src={art.art} alt="" loading="lazy" draggable="false" />
      </div>
      <div className="df-lobby__featured-fade" aria-hidden />
      <div className="df-lobby__featured-games">
        <div
          ref={scrollerRef}
          className="df-lobby__featured-scroller"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
        >
          <div className="df-lobby__featured-grid">
            {list.map((g, i) => (
              <Tile
                key={g.id || i}
                game={g}
                onPlay={onPlay}
                playing={playingId != null && String(playingId) === String(g.gameid)}
                className="df-lobby__featured-tile"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- page ---------- */
export function CasinoLobby() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const categories = useCasinoLobbyCategories({ enabled: isAuthenticated });
  const {
    handlePlayGame,
    launchingGameId,
    depositRequiredModalOpen,
    closeDepositRequiredModal,
    activationBonusType,
  } = useLaunchDashboardSlotGame();

  const allGames = useMemo(() => categories.flatMap((c) => c.games), [categories]);
  const iconFor = useCallback(
    (id) => cfg.categories.find((c) => c.id === id)?.icon,
    []
  );
  // Lobby panels that sit between the game sections (same spots as the reference lobby).
  const renderLobbyInsert = useCallback((afterTitle) => {
    switch (afterTitle) {
      case 'GD Best Banner':
        return (
          <>
            <PackagesRow />
            <InviteDeals />
          </>
        );
      case 'Keno':
        return <ProvidersStrip />;
      case 'Shooting':
        return <ExclusiveBanner />;
      default:
        return null;
    }
  }, []);
  const topRef = useRef(null);
  useEffect(() => {
    topRef.current?.scrollIntoView?.({ block: 'start' });
  }, []);

  return (
    <div className="df-lobby" ref={topRef}>
      <BannerCarousel />
      <PromoCards />
      <CategoryTabs />

      <section className="df-lobby__section">
        <SectionHead title={cfg.recentWinsTitle} />
        <BigWinsTicker />
      </section>

      {isAuthenticated ? (
        <GoldenLobbySections onPlayGame={handlePlayGame} renderInsert={renderLobbyInsert} />
      ) : (
        <>
          <FeaturedGameSection games={allGames} onPlay={handlePlayGame} playingId={launchingGameId} />

          <div className="df-lobby__gate">
            <p>Sign in to browse the full game catalog.</p>
            <button type="button" className="df-lobby__cta df-lobby__cta--sm" onClick={() => navigate('/register')}>
              Sign Up
            </button>
          </div>

          <PackagesRow />
          <ProvidersStrip />
          <InviteDeals />
          <ExclusiveBanner />
        </>
      )}

      <PickForMe games={allGames} onPlay={handlePlayGame} />
      <TopWinners />

      <DepositRequiredModal
        open={depositRequiredModalOpen}
        onClose={closeDepositRequiredModal}
        activationBonusType={activationBonusType}
      />
    </div>
  );
}

export default CasinoLobby;
