import { useMemo } from 'react';
import { homeConfig } from '../../../config/homeConfig';
import '../../../styles/home-v2.css';
import { Hero1 } from './Hero1';
import { Hero2 } from './Hero2';
import { IntroSection } from './IntroSection';
import { CategoryStrip } from './CategoryStrip';
import { TopGamesSection } from './TopGamesSection';
import { PlatformsSection } from './PlatformsSection';
import { ReasonsSection } from './ReasonsSection';
import { ProviderStrip } from './ProviderStrip';
import { TestimonialsSection } from './TestimonialsSection';
import { PromoBanner } from './PromoBanner';
import { FeatureCardsSection } from './FeatureCardsSection';
import { NoPurchaseSection } from './NoPurchaseSection';

// Matches the perf gating the previous guest sections used: hero/catalog
// render immediately, heavier below-fold content waits for `belowFoldReady`
// (see src/pages/Home/index.jsx) so LCP/above-the-fold paint isn't delayed.
const BELOW_FOLD_KEYS = new Set([
  'reasons',
  'providers',
  'testimonials',
  'banner1',
  'featureCards',
  'noPurchase',
  'banner2',
]);

const SECTION_COMPONENTS = {
  hero1: Hero1,
  hero2: Hero2,
  intro: IntroSection,
  categoryStrip: CategoryStrip,
  topGames: TopGamesSection,
  platforms: PlatformsSection,
  reasons: ReasonsSection,
  providers: ProviderStrip,
  testimonials: TestimonialsSection,
  banner1: () => <PromoBanner configKey="banner1" />,
  featureCards: FeatureCardsSection,
  noPurchase: NoPurchaseSection,
  banner2: () => <PromoBanner configKey="banner2" />,
};

/**
 * Guest-landing home page, fully driven by src/config/homeConfig.js.
 * Renders only between the site-wide Navbar/SpinzySidebar and LandingFooter
 * (both untouched) — see src/pages/Home/index.jsx for the mount point.
 */
export function HomeV2({ revealBelowFold = true }) {
  const { theme, sections } = homeConfig;

  const cssVars = useMemo(() => {
    const vars = {};
    Object.entries(theme.colors).forEach(([key, value]) => {
      vars[`--df-home2-color-${key}`] = value;
    });
    Object.entries(theme.fonts).forEach(([key, value]) => {
      vars[`--df-home2-font-${key}`] = value;
    });
    Object.entries(theme.radius).forEach(([key, value]) => {
      vars[`--df-home2-radius-${key}`] = `${value}px`;
    });
    Object.entries(theme.layout).forEach(([key, value]) => {
      vars[`--df-home2-layout-${key}`] = `${value}px`;
    });
    return vars;
  }, [theme]);

  return (
    <div className="df-home2" style={cssVars}>
      {sections.order
        .filter((key) => sections.enabled[key])
        .filter((key) => revealBelowFold || !BELOW_FOLD_KEYS.has(key))
        .map((key) => {
          const Section = SECTION_COMPONENTS[key];
          if (!Section) return null;
          return <Section key={key} />;
        })}
    </div>
  );
}

export default HomeV2;
