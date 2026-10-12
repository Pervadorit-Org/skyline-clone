import { Fragment, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import lobbyData from '../../data/goldenLobby.json';
import { getAllCachedProviderSlotGames } from '../../utils/dashboardSlotGamesCache';
import { useToast } from '../../context/ToastContext';
import '../../styles/golden-lobby.css';

/**
 * Casino lobby sections (featured banners, category rows, mosaics, Top 10 …),
 * rendered from src/data/goldenLobby.json. `renderInsert(afterTitle)` lets the
 * lobby slot its own panels (packages, providers …) between sections.
 */

const CDN = lobbyData.base;
const assetUrl = (p) => (/^(https?:|data:)/.test(p || '') ? p : `${CDN}${p || ''}`);
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

/** Match a lobby entry to a playable game from the provider catalog (by title). */
function findCatalogGame(entry) {
  const key = norm(entry.title);
  if (!key) return null;
  const all = getAllCachedProviderSlotGames();
  return all.find((g) => norm(g.title || g.name) === key) || null;
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
  return (
    <button
      type="button"
      className={`gl-card ${className}`.trim()}
      style={style}
      title={game.title}
      aria-label={`Play ${game.title}`}
      onClick={() => onPlay(game)}
    >
      <img src={assetUrl(game.img)} alt={game.title} loading="lazy" draggable="false" />
    </button>
  );
}

function SectionHeader({ section, onPrev, onNext }) {
  const iconIsCategory = String(section.icon || '').startsWith('game-categories/');
  return (
    <header className="gl-head">
      <h2 className="gl-head__title">
        {section.icon ? (
          <span className={`gl-head__icon${iconIsCategory ? ' gl-head__icon--cat' : ''}`} aria-hidden="true">
            <img src={assetUrl(section.icon)} alt="" />
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
                <GameCard key={g.id} game={g} onPlay={onPlay} />
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
              key={g.id}
              className="gl-mosaic__cell"
              style={{
                gridColumn: `${g.col} / span ${g.cs}`,
                gridRow: `${g.row} / span ${g.rs}`,
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
            <GameCard key={g.id} game={g} onPlay={onPlay} />
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
              <img src={assetUrl(section.icon)} alt="" />
            </span>
          ) : null}
          {section.title}
        </h2>
      </header>
      <div className="gl-scroller gl-scroller--rank" ref={ref} {...handlers}>
        <div className="gl-rank">
          {section.games.map((g, i) => (
            <div className="gl-rank__item" key={g.id}>
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
      <picture className="gl-featured__bg">
        <source media="(min-width: 768px)" srcSet={assetUrl(section.bgDesktop)} />
        <img src={assetUrl(section.bgMobile)} alt={section.title} loading="lazy" />
      </picture>
      <div className="gl-featured__fade" aria-hidden="true" />
      <div className="gl-featured__games">
        <div className="gl-scroller gl-scroller--featured" ref={ref} {...handlers}>
          <div className="gl-featured__grid">
            {section.games.map((g) => (
              <GameCard key={g.id} game={g} onPlay={onPlay} />
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
  const { toast } = useToast();

  const handlePlay = useCallback(
    (entry) => {
      const game = findCatalogGame(entry);
      if (!game) {
        toast?.info?.(`${entry.title} isn't available to launch right now.`);
        return;
      }
      onPlayGame(game);
    },
    [onPlayGame, toast]
  );

  return (
    <div className="gl-feed">
      {lobbyData.sections.map((section, i) => {
        const Section = SECTION_BY_TYPE[section.type];
        if (!Section) return null;
        return (
          <Fragment key={`${section.type}-${section.title}-${i}`}>
            <Section section={section} onPlay={handlePlay} />
            {renderInsert ? renderInsert(section.title) : null}
          </Fragment>
        );
      })}
    </div>
  );
}

export default GoldenLobbySections;
