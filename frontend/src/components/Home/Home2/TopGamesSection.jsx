import { lazy, Suspense } from 'react';
import { useHomeConfig } from '../../../config/homeConfigContext';
import { SectionHeading } from './SectionHeading';

// Reuses the already-live DashboardSlotGamesSection(catalogOnly) pipeline —
// real provider games (gitslotpark/onegamehub/bona/scorpio), real categories
// rendered as the "category tabs", no mock data. Only the section heading copy
// is config-driven here. Platform tiles (Golden Dragon, Ultra Panda, …) are
// intentionally not shown in this section, and neither are the category tabs (All, Slots, Fishing, …) or the VIEW MORE button.
const DashboardSlotGamesSection = lazy(() =>
  import('../DashboardSlotGamesSection').then((m) => ({ default: m.DashboardSlotGamesSection }))
);

export function TopGamesSection() {
  const homeConfig = useHomeConfig();
  return (
    <section className="df-home2-section df-home2-top-games">
      <SectionHeading title={homeConfig.topGames.title} />
      <Suspense fallback={null}>
        <DashboardSlotGamesSection catalogOnly hideIntro hideCategoryTabs hideViewMore />
      </Suspense>
    </section>
  );
}

export default TopGamesSection;
