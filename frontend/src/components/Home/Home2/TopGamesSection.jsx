import { lazy, Suspense, useEffect, useRef, useState } from 'react';
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

/** True once the element is within `margin` of the viewport (or immediately without IntersectionObserver). */
function useNearViewport(ref, margin = '100px') {
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (near) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: margin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near, ref, margin]);
  return near;
}

export function TopGamesSection() {
  const homeConfig = useHomeConfig();
  const bodyRef = useRef(null);
  // The catalog pulls every provider's game list (~300 KB + several API calls); start it only when the
  // section is about to be seen, and keep its height reserved so nothing shifts when it fills in.
  const near = useNearViewport(bodyRef);
  return (
    <section className="df-home2-section df-home2-top-games">
      <SectionHeading title={homeConfig.topGames.title} />
      <div ref={bodyRef} className="df-home2-top-games__body">
        {near ? (
          <Suspense fallback={null}>
            <DashboardSlotGamesSection catalogOnly hideIntro hideCategoryTabs hideViewMore />
          </Suspense>
        ) : null}
      </div>
    </section>
  );
}

export default TopGamesSection;
