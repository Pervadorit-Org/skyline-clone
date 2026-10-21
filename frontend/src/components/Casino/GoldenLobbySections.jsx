import { Fragment, useCallback, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLobbyCatalog } from '../../hooks/useLobbyCatalog';
import { useLobbyContent } from '../../hooks/useLobbyContent';
import { useLobbyPopular } from '../../hooks/useLobbyPopular';
import { buildCategoryGameIndex, prepareDashboardSlotGames } from '../../utils/slotLobbyGames';
import { buildLobbySections } from './lobbyBuilder';
import '../../styles/golden-lobby.css';

/**
 * The signed-in lobby feed: rows of games from the live game list (provider catalog), laid out by
 * lobbyDefaults.js and the admin's changes (Admin → Pages → Lobby). `renderInsert(afterId)` lets the
 * lobby slot its own panels (packages, providers …) between rows.
 */

const PLACEHOLDER = '/logo.webp';

function gameImage(game) {
  const icons = Array.isArray(game?.iconUrls) ? game.iconUrls : [];
  return [game?.image, ...icons].find((u) => typeof u === 'string' && u.trim()) || PLACEHOLDER;
}

function ArrowIcon() {
  return (
    <svg width="20" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

/** Horizontal scroller: drag to scroll, optional external arrow control. */
function useDragScroll() {
  const ref = useRef(null);
  const state = useRef({ down: false, x: 0, left: 0, moved: false });

  const handlers = {
    onPointerDown: (e) => {
      if (e.pointerType !== 'mouse') return;
      const el = ref.current;
      state.current = { down: true, x: e.clientX, left: el.scrollLeft, moved: false };
    },
    onPointerMove: (e) => {
      const s = state.current;
      if (!s.down) return;
      const dx = e.clientX - s.x;
      if (Math.abs(dx) > 5) s.moved = true;
      ref.current.scrollLeft = s.left - dx;
    },
    onPointerUp: () => {
      state.current.down = false;
    },
    onPointerLeave: () => {
      state.current.down = false;
    },
    // swallow the click that ends a drag
    onClickCapture: (e) => {
      if (state.current.moved) {
        e.stopPropagation();
        e.preventDefault();
        state.current.moved = false;
      }
    },
  };

  const scrollBy = useCallback((dir) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  }, []);

  return { ref, handlers, scrollBy };
}

function GameCard({ game, onPlay, className = '', style }) {
  const [src, setSrc] = useState(() => gameImage(game));
  const title = game.title || game.name || 'Game';
  return (
    <button
      type="button"
      className={`gl-card ${className}`.trim()}
      style={style}
      title={title}
      aria-label={`Play ${title}`}
      onClick={() => onPlay(game)}
    >
      <img src={src} alt={title} loading="lazy" draggable="false" onError={() => setSrc(PLACEHOLDER)} />
    </button>
  );
}

function SectionHeader({ section, onPrev, onNext }) {
  const iconIsCategory = Boolean(section.iconIsCategory);
  return (
    <header className="gl-head">
      <h2 className="gl-head__title">
        {section.icon ? (
          <span className={`gl-head__icon${iconIsCategory ? ' gl-head__icon--cat' : ''}`} aria-hidden="true">
            <img src={section.icon} alt="" />
          </span>
        ) : null}
        {section.title}
      </h2>
      <div className="gl-head__actions">
        {section.viewAll ? (
          <Link to={section.viewAll} className="gl-head__viewall">
            View All
          </Link>
        ) : null}
        <div className="gl-head__arrows">
          <button type="button" className="gl-head__arrow gl-head__arrow--prev" aria-label="Previous" onClick={onPrev}>
            <ArrowIcon />
          </button>
          <button type="button" className="gl-head__arrow" aria-label="Next" onClick={onNext}>
            <ArrowIcon />
          </button>
        </div>
      </div>
    </header>
  );
}

/* ---------- category row(s): 1–3 stacked lines of fixed-width cards ---------- */
function RowsSection({ section, onPlay }) {
  const { ref, handlers, scrollBy } = useDragScroll();
  return (
    <section className="gl-section">
      <SectionHeader section={section} onPrev={() => scrollBy(-1)} onNext={() => scrollBy(1)} />
      <div className="gl-scroller" ref={ref} {...handlers}>
        <div className="gl-rows">
          {section.rows.map((row, ri) => (
            <div className="gl-rows__line" key={ri}>
              {row.map((g) => (
                <GameCard key={g.id || g.gameid} game={g} onPlay={onPlay} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 3-row mosaic with spanning feature tiles ---------- */
function MosaicSection({ section, onPlay }) {
  const { ref, handlers, scrollBy } = useDragScroll();
  return (
    <section className="gl-section">
      <SectionHeader section={section} onPrev={() => scrollBy(-1)} onNext={() => scrollBy(1)} />
      <div className="gl-scroller" ref={ref} {...handlers}>
        <div className="gl-mosaic">
          {section.games.map((g) => (
            <div
              key={g.id || g.gameid}
              className="gl-mosaic__cell"
              style={{
                gridColumn: `${g._cell.col} / span ${g._cell.cs}`,
                gridRow: `${g._cell.row} / span ${g._cell.rs}`,
              }}
            >
              <GameCard game={g} onPlay={onPlay} className="gl-card--fill" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- flowing grid (New Games) ---------- */
function GridSection({ section, onPlay }) {
  const { ref, handlers, scrollBy } = useDragScroll();
  return (
    <section className="gl-section">
      <SectionHeader section={section} onPrev={() => scrollBy(-1)} onNext={() => scrollBy(1)} />
      <div className="gl-scroller" ref={ref} {...handlers}>
        <div className="gl-grid">
          {section.games.map((g) => (
            <GameCard key={g.id || g.gameid} game={g} onPlay={onPlay} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Top 10: giant outlined rank numerals ---------- */
function RankSection({ section, onPlay }) {
  const { ref, handlers } = useDragScroll();
  return (
    <section className="gl-section">
      <header className="gl-head">
        <h2 className="gl-head__title">
          {section.icon ? (
            <span className="gl-head__icon gl-head__icon--cat" aria-hidden="true">
              <img src={section.icon} alt="" />
            </span>
          ) : null}
          {section.title}
        </h2>
      </header>
      <div className="gl-scroller gl-scroller--rank" ref={ref} {...handlers}>
        <div className="gl-rank">
          {section.games.map((g, i) => (
            <div className="gl-rank__item" key={g.id || g.gameid}>
              <span
                className={`gl-rank__num${i === 0 ? ' is-first' : i === section.games.length - 1 && section.games.length >= 10 ? ' is-last' : ''}`}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div className="gl-rank__card">
                <div className="gl-rank__hover" aria-hidden="true">
                  <svg viewBox="0 0 24 25" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12.0002 24.1673C18.4434 24.1673 23.6668 18.9439 23.6668 12.5007C23.6668 6.05733 18.4434 0.833984 12.0002 0.833984C5.55684 0.833984 0.333496 6.05733 0.333496 12.5007C0.333496 18.9439 5.55684 24.1673 12.0002 24.1673ZM10.4759 16.9874L15.9828 13.7362C16.8948 13.1976 16.8948 11.8037 15.9828 11.2652L10.4759 8.01387C9.58949 7.49053 8.50016 8.1717 8.50016 9.24934V15.7519C8.50016 16.8296 9.58949 17.5108 10.4759 16.9874Z"
                    />
                  </svg>
                </div>
                <GameCard game={g} onPlay={onPlay} className="gl-card--block" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- featured provider banner: parallax art + 2-row game strip ---------- */
function FeaturedSection({ section, onPlay }) {
  const { ref, handlers } = useDragScroll();
  return (
    <section className="gl-featured" aria-label={section.title}>
      {section.bgDesktop ? (
        <picture className="gl-featured__bg">
          <source media="(min-width: 768px)" srcSet={section.bgDesktop} />
          <img src={section.bgMobile || section.bgDesktop} alt={section.title} loading="lazy" />
        </picture>
      ) : (
        // No artwork uploaded: our own gradient with the studio name.
        <div className="gl-featured__bg gl-featured__bg--plain" aria-hidden="true">
          <span className="gl-featured__studio">{section.brand || section.title}</span>
        </div>
      )}
      <div className="gl-featured__fade" aria-hidden="true" />
      <div className="gl-featured__games">
        <div className="gl-scroller gl-scroller--featured" ref={ref} {...handlers}>
          <div className="gl-featured__grid">
            {section.games.map((g) => (
              <GameCard key={g.id || g.gameid} game={g} onPlay={onPlay} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const SECTION_BY_TYPE = {
  featured: FeaturedSection,
  rows: RowsSection,
  mosaic: MosaicSection,
  grid: GridSection,
  rank: RankSection,
};

export function GoldenLobbySections({ onPlayGame, renderInsert }) {
  const rawGames = useLobbyCatalog();
  const content = useLobbyContent();
  const popular = useLobbyPopular();

  const sections = useMemo(() => {
    if (!rawGames.length) return [];
    const eligible = prepareDashboardSlotGames(rawGames).filter(
      (g) => String(g.provider || '').toLowerCase() !== 'bona'
    );
    const index = buildCategoryGameIndex(rawGames);
    return buildLobbySections(eligible, (catalogId) => index.get(catalogId) || [], content, popular);
  }, [rawGames, content, popular]);

  const handlePlay = useCallback((game) => onPlayGame(game), [onPlayGame]);

  return (
    <div className="gl-feed">
      {sections.map((section) => {
        const Section = SECTION_BY_TYPE[section.type];
        if (!Section) return null;
        return (
          <Fragment key={section.id}>
            <Section section={section} onPlay={handlePlay} />
            {renderInsert ? renderInsert(section.id) : null}
          </Fragment>
        );
      })}
    </div>
  );
}

export default GoldenLobbySections;
