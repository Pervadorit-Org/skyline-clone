import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useHomeConfig } from '../../../config/homeConfigContext';
import { SectionHeading } from './SectionHeading';

// Reuses the already-live DashboardSlotGamesSection(catalogOnly) pipeline —
// real provider games (gitslotpark/onegamehub/bona/scorpio), real categories
// rendered as the "category tabs" the spec asks for, no mock data. Only the
// section heading copy is config-driven here; tab labels/icons/game art all
// come from the live catalog.
const DashboardSlotGamesSection = lazy(() =>
  import('../DashboardSlotGamesSection').then((m) => ({ default: m.DashboardSlotGamesSection }))
);

// Static showcase tiles (DragonFury's own game art) shown while the live
// catalog is empty. Hidden once the real catalog renders tiles of its own.
function StaticTopGames() {
  const homeConfig = useHomeConfig();
  const { games = [], gameHref = '/register' } = homeConfig.topGames;
  if (games.length === 0) return null;
  return (
    <div className="df-games-included df-home2-static-games">
      <div className="df-games-grid--dense">
        {games.map((g) => (
          <Link key={g.name} to={gameHref} className="df-game-card" aria-label={g.name}>
            <img src={g.image} alt={g.name} loading="lazy" decoding="async" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function TopGamesSection() {
  const homeConfig = useHomeConfig();
  // When the live catalog renders any game cards, hide the static fallback.
  const [hasLiveGames, setHasLiveGames] = useState(false);
  useEffect(() => {
    const check = () => {
      // `.df-game-card-wrap` is rendered only by the live catalog (SlotGamesCatalogGrid),
      // never by the static fallback below — so this detects real games only.
      const live = document.querySelector('.df-home2-top-games .df-game-card-wrap');
      setHasLiveGames(Boolean(live));
    };
    const id = setInterval(check, 800);
    check();
    return () => clearInterval(id);
  }, []);

  return (
    <section className="df-home2-section df-home2-top-games">
      <SectionHeading title={homeConfig.topGames.title} />
      {!hasLiveGames ? <StaticTopGames /> : null}
      <Suspense fallback={null}>
        <DashboardSlotGamesSection catalogOnly hideIntro />
      </Suspense>
    </section>
  );
}

export default TopGamesSection;
