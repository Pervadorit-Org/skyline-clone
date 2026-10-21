import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { LOBBY_INSERT_AFTER } from '../../config/lobbyDefaults';
import { useLobbyContent } from '../../hooks/useLobbyContent';
import { useLobbyConfig } from '../../hooks/useLobbyConfig';
import { getGameCategoryPath } from '../../config/gameCategories';
import { useAvailableGameCategories } from '../../hooks/useAvailableGameCategories';
import { useAuth } from '../../context/AuthContext';
import { useCasinoLobbyCategories } from '../Home/homeCasinoLobbyMix';
import { useLaunchDashboardSlotGame } from '../../hooks/useLaunchDashboardSlotGame';
import { DepositRequiredModal } from '../Games/DepositRequiredModal';
import { GoldenLobbySections } from './GoldenLobbySections';
import { BIG_WIN_ENTRIES } from '../Home/RecentBigWins';
import { fetchNormalizedDepositPackagesCatalog } from '../../api/depositPackages';
import { cloneGuestWinnerRows } from '../../utils/guestWinnersLeaderboard';
import { getAllCachedProviderSlotGames } from '../../utils/dashboardSlotGamesCache';
import { prepareDashboardSlotGames } from '../../utils/slotLobbyGames';
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
  const cfg = useLobbyConfig();
  const { isAuthenticated } = useAuth();
  const [active, setActive] = useState(0);
  // Signed-in players get the image banners; guests keep the built-in slides.
  const content = useLobbyContent();
  // Banners saved from the backend (/api/lobby-images) win; otherwise the built-in slides.
  const adminBanners = (content.banners || []).filter((b) => b && (b.desktop || b.mobile));
  const imageBanners = adminBanners.length ? adminBanners : cfg.imageBanners;
  const imageMode = isAuthenticated && imageBanners?.length > 0;
  const slides = imageMode ? imageBanners : cfg.banners.filter((b) => !cfg.off(`banner:${b.id}`));

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
      {imageMode ? (
        <div className="df-lobby__badges">
          <Link to="/store" className="df-lobby__badge df-lobby__badge--tl"><img src="/ref/lobby/badge-basket.webp" alt="" /><span className="is-sale">Flash Sale</span></Link>
          <Link to="/account/affiliate" className="df-lobby__badge df-lobby__badge--tr"><img src="/ref/lobby/badge-phone-share.webp" alt="" /><span className="is-ref">Refer a Friend</span></Link>
          <Link to="/daily-bonus" className="df-lobby__badge df-lobby__badge--br"><img src="/ref/lobby/badge-clipboard.webp" alt="" /><span className="is-daily">Daily Rewards</span></Link>
          <Link to="/spinwheel" className="df-lobby__badge df-lobby__badge--bl"><img src="/ref/lobby/badge-trophy.webp" alt="" /><span className="is-join">Join Now</span></Link>
        </div>
      ) : null}
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
  const cfg = useLobbyConfig();
  const content = useLobbyContent();
  // Card backgrounds the backend saved win over the built-in artwork.
  const backendBg = { daily: content.dailyCardBg, spin: content.spinCardBg };
  return (
    <section className="df-lobby__promos">
      {cfg.promoCards.map((card) => {
        const c = backendBg[card.id] ? { ...card, bg: backendBg[card.id] } : card;
        return (
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
        );
      })}
    </section>
  );
}

/* ---------- category pills ---------- */
function CategoryTabs() {
  const cfg = useLobbyConfig();
  const isCategoryAvailable = useAvailableGameCategories();
  return (
    <nav className="df-lobby__tabs" aria-label="Game categories">
      <Link to="/casino" className="df-lobby__tabs-search" aria-label="Search games">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </Link>
      {cfg.categories.filter((c) => !c.id || isCategoryAvailable(c.id)).map((c, i) => (
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
  const cfg = useLobbyConfig();
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
  const cfg = useLobbyConfig();
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
/** 50000 -> "50K", 1500000 -> "1.5M" (Gold Coin package headline). */
function compactCoins(n) {
  const v = Number(n) || 0;
  if (v >= 1e6) return `${+(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${+(v / 1e3).toFixed(1)}K`;
  return String(v);
}

function GoldCoinIcon({ size = 24 }) {
  return (
    <svg className="df-gcpkg__gold" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#c98a06" />
      <circle cx="12" cy="12" r="9.6" fill="#f7c524" stroke="#ffe27a" strokeWidth="1" />
      <text x="12" y="16.4" textAnchor="middle" fontSize="12" fontWeight="900" fill="#a86a00" fontFamily="Outfit, sans-serif">G</text>
    </svg>
  );
}

function SweepCoinIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="df-gcpkg__sweep">
      <circle cx="12" cy="12" r="11" fill="#0f8f3c" />
      <circle cx="12" cy="12" r="9.6" fill="#19c45a" stroke="#7df0a6" strokeWidth="1" />
      <text x="12" y="16.4" textAnchor="middle" fontSize="12" fontWeight="900" fill="#064a1e" fontFamily="Outfit, sans-serif">S</text>
    </svg>
  );
}

/** Coin pile art: more coins for bigger packages, plus one sweeps coin. */
function CoinPile({ level }) {
  const stacks = Math.min(4, 1 + Math.floor(level / 3));
  const height = 2 + Math.min(level, 11) % 4 + Math.floor(level / 4);
  const gold = (cx, cy, k) => (
    <g key={`${cx}-${cy}-${k}`}>
      <ellipse cx={cx} cy={cy + 3} rx="11" ry="4.5" fill="#a86a00" />
      <ellipse cx={cx} cy={cy} rx="11" ry="4.5" fill="#f7c524" stroke="#ffe27a" strokeWidth="0.8" />
    </g>
  );
  const items = [];
  for (let st = 0; st < stacks; st += 1) {
    const cx = 22 + st * 15 - (stacks - 1) * 5;
    const n = Math.max(2, height - st);
    for (let i = 0; i < n; i += 1) items.push(gold(cx, 40 - i * 3.4 - (st % 2) * 3, i));
  }
  return (
    <svg className="df-gcpkg__pile" viewBox="2 0 72 48" aria-hidden="true">
      {items}
      <circle cx="60" cy="36" r="9" fill="#0f8f3c" />
      <circle cx="60" cy="36" r="7.6" fill="#19c45a" stroke="#7df0a6" strokeWidth="0.8" />
      <text x="60" y="40" textAnchor="middle" fontSize="11" fontWeight="900" fill="#064a1e" fontFamily="Outfit, sans-serif">S</text>
    </svg>
  );
}

function ribbonTone(label) {
  const t = String(label || '').trim().toUpperCase();
  if (t === 'FAVORITE' || t === 'FAVOURITE') return 'purple';
  if (t === 'POPULAR') return 'popular';
  return 'gold';
}

function GcPackageCard({ pkg, href, level }) {
  const gc = Number(pkg.gc_coin) || 0;
  const freeSc = Number(pkg.final_sc) || 0;
  const price = Number(pkg.final_price) || 0;
  const was = Number(pkg.actual_price) || 0;
  const ribbon = pkg.discount_label ? String(pkg.discount_label).trim() : '';
  return (
    <div className="df-gcpkg__slot">
      <Link to={href} className="df-gcpkg" aria-label={`${compactCoins(gc)} Gold Coins for $${price.toFixed(2)}`}>
        {ribbon ? (
          <span className={`df-gcpkg__ribbon df-gcpkg__ribbon--${ribbonTone(ribbon)}`}>{ribbon}</span>
        ) : null}
        <span className="df-gcpkg__inner">
          <span className="df-gcpkg__gc">
            <GoldCoinIcon />
            <span className={`df-gcpkg__gc-num${gc >= 1e6 ? ' is-small' : ''}`}>{compactCoins(gc)}</span>
          </span>
          <CoinPile level={level} />
          {freeSc > 0 ? (
            <span className="df-gcpkg__free">
              <span>+ FREE SC</span>
              <SweepCoinIcon />
              <b>{+freeSc.toFixed(2)}</b>
            </span>
          ) : (
            <span className="df-gcpkg__free df-gcpkg__free--none" aria-hidden="true">&nbsp;</span>
          )}
        </span>
        <span className="df-gcpkg__price">
          {was > price ? <s>{`$${+was.toFixed(2)}`}</s> : null}
          <span>{`$${price.toFixed(2)}`}</span>
        </span>
      </Link>
    </div>
  );
}

function PackagesRow() {
  const cfg = useLobbyConfig();
  const off = cfg.off('panel:packages');
  const [pkgs, setPkgs] = useState([]);
  useEffect(() => {
    let off = false;
    fetchNormalizedDepositPackagesCatalog({ retries: 0 })
      .then((c) => {
        if (off) return;
        const all = (c.groups || []).flatMap((g) => g.packages || []);
        const gcStore = all.some((p) => Number(p.gc_coin) > 0);
        setPkgs(gcStore ? all : all.slice(0, cfg.packages.limit));
      })
      .catch(() => {});
    return () => {
      off = true;
    };
  }, []);
  if (off || !pkgs.length) return null;
  const gcStore = pkgs.some((p) => Number(p.gc_coin) > 0);
  if (gcStore) {
    return (
      <section className="df-lobby__section">
        <SectionHead title={cfg.packages.title} href={cfg.packages.href} icon="/df-online/sc-coin.webp" />
        <div className="df-lobby__scroller df-gcpkg__row">
          {pkgs.map((p, i) => (
            <GcPackageCard key={p.id} pkg={p} href={cfg.packages.href} level={i} />
          ))}
        </div>
      </section>
    );
  }
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

function InviteDeals() {
  const cfg = useLobbyConfig();
  const { invite, deals } = cfg;
  const showInvite = !cfg.off('panel:invite');
  const showDeals = !cfg.off('panel:deals');
  if (!showInvite && !showDeals) return null;
  return (
    <section className="df-lobby__invite-deals">
      {showInvite ? (
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
      ) : null}
      {showDeals ? (
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
      ) : null}
    </section>
  );
}

function ExclusiveBanner() {
  const cfg = useLobbyConfig();
  const e = cfg.exclusive;
  if (cfg.off('panel:exclusive')) return null;
  return (
    <section className="df-lobby__section">
      <SectionHead title={e.title} icon="/ref/lobby/gem.svg" />
      <Link to={e.href} className="df-ex">
        <div className="df-ex__copy">
          <p>{e.headline}</p>
          <strong>{e.highlight}</strong>
        </div>
        <img className="df-ex__a" src="/ref/lobby/exclusive/top-right.webp" alt="" aria-hidden="true" loading="lazy" draggable="false" />
        <img className="df-ex__b" src="/ref/lobby/exclusive/bottom-right.webp" alt="" aria-hidden="true" loading="lazy" draggable="false" />
        <img className="df-ex__man" src="/ref/lobby/exclusive/man-holding-chest.webp" alt="" aria-hidden="true" loading="lazy" draggable="false" />
      </Link>
    </section>
  );
}

function PickForMe({ games, onPlay }) {
  const cfg = useLobbyConfig();
  const [picked, setPicked] = useState(null);
  useEffect(() => {
    if (!picked) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setPicked(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picked]);
  if (cfg.off('panel:pick')) return null;
  const pick = () => {
    // Lobby rows first; otherwise any game from the cached provider catalog.
    const pool = games.length ? games : prepareDashboardSlotGames(getAllCachedProviderSlotGames());
    if (!pool.length) return;
    setPicked(pool[Math.floor(Math.random() * pool.length)]);
  };
  const play = () => {
    const game = picked;
    setPicked(null);
    if (game) onPlay(game);
  };
  return (
    <section className="df-lobby__pick">
      <h3>{cfg.pick.title}</h3>
      <p>{cfg.pick.subtitle}</p>
      <button type="button" className="df-lobby__chip df-lobby__chip--lg" onClick={pick}>
        {cfg.pick.ctaLabel}
      </button>
      {picked
        ? createPortal(
            <div className="df-pick" role="presentation" onClick={() => setPicked(null)}>
              <div
                className="df-pick__box"
                role="dialog"
                aria-modal="true"
                aria-labelledby="df-pick-title"
                onClick={(e) => e.stopPropagation()}
              >
                <button type="button" className="df-pick__close" aria-label="Close" onClick={() => setPicked(null)}>
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
                <h2 id="df-pick-title">Your lucky pick is here!</h2>
                <div className="df-pick__img">
                  <img src={gameImage(picked)} alt={picked.title || picked.name || 'Game'} width="128" height="128" draggable="false" />
                </div>
                <p>{picked.title || picked.name}</p>
                <button type="button" className="df-pick__play" onClick={play}>
                  Play Now
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </section>
  );
}

function TopWinners() {
  const cfg = useLobbyConfig();
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
  if (cfg.off('panel:winners')) return null;
  return (
    <section className="df-tw">
      <h2 className="df-tw__title">
        {w.titleLead} <span>{w.titleHighlight}</span>
      </h2>
      <div className={`df-tw__cols${showAll ? '' : ' is-collapsed'}`}>
        {cols.map((c) => (
          <div key={c.id} className="df-tw__col">
            <h4>{c.label}</h4>
            <ul>
              {c.rows.slice(0, showAll ? c.rows.length : w.initialRows).map((r) => (
                <li key={r._id} className="df-tw__row">
                  <span className="df-tw__thumb" aria-hidden>
                    {r.image ? <img src={r.image} alt="" loading="lazy" draggable="false" /> : r.avatar}
                  </span>
                  <span className="df-tw__meta">
                    <b>{r.game}</b>
                    <span className="df-tw__prize">
                      <img src="/ref/images/sweep-coin.webp" alt="" width="22" height="22" />
                      {String(r.prize).replace(/\s*SC$/i, '')}
                    </span>
                  </span>
                  <Link to="/casino" className="df-tw__play" aria-label={`Play ${r.game}`}>
                    <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
                      <circle cx="12" cy="12" r="11.5" fill="#fff" />
                      <path d="M10 8.2v7.6a.6.6 0 0 0 .9.5l6.2-3.8a.6.6 0 0 0 0-1l-6.2-3.8a.6.6 0 0 0-.9.5z" fill="#1a1b2b" />
                    </svg>
                    <span>Play</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {!showAll ? (
        <button type="button" className="df-tw__more" onClick={() => setShowAll(true)}>
          {w.showMoreLabel}
        </button>
      ) : null}
    </section>
  );
}

/* ---------- featured provider showcase (art backdrop + 2-row game strip) ---------- */
function FeaturedGameSection({ games, onPlay, playingId }) {
  const cfg = useLobbyConfig();
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
  const cfg = useLobbyConfig();
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
  const renderLobbyInsert = useCallback((afterId) => {
    const panels = LOBBY_INSERT_AFTER[afterId];
    if (!panels) return null;
    return (
      <>
        {panels.includes('packages') ? <PackagesRow /> : null}
        {panels.includes('inviteDeals') ? <InviteDeals /> : null}
        {panels.includes('exclusive') ? <ExclusiveBanner /> : null}
      </>
    );
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

      {cfg.off('panel:wins') ? null : (
        <section className="df-lobby__section">
          <SectionHead title={cfg.recentWinsTitle} />
          <BigWinsTicker />
        </section>
      )}

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
