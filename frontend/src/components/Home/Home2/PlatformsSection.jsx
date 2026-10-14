import { useHomeConfig } from '../../../config/homeConfigContext';
import { useFooterContent } from '../../../hooks/useFooterContent';
import { useGamePageList } from '../../../hooks/useGamePageLinks';
import { GuestHomePlatforms } from '../GuestHomePlatforms';

// The tiles are the footer "Platforms" links (Admin → Pages → Footer → Platforms): the store's platform
// pages, then any extra label + link entries the admin added there. Each tile opens its link.
// Only the heading and the tile count are set in Admin → Pages → Home Page.
// With nothing managed (API down / not set up) it keeps the built-in platform tiles.
export function PlatformsSection() {
  const homeConfig = useHomeConfig();
  const footer = useFooterContent();
  const { title, limit, items } = homeConfig.platforms;
  const { loaded, pages } = useGamePageList();
  if (!loaded) return null;

  const seen = new Set(pages.map((p) => String(p.to).toLowerCase()));
  const extras = (footer.platforms?.items || [])
    .filter((l) => l?.label && l?.href && !seen.has(String(l.href).toLowerCase()))
    .map((l) => ({ key: `extra-${l.href}`, label: l.label, to: l.href, image: l.image || '' }));
  // "Max tiles" limits the platform pages; extra links the admin added are always shown after them.
  const tiles = [...(limit ? pages.slice(0, limit) : pages), ...extras];

  return (
    <div className="df-home2-section df-home2-platforms">
      <GuestHomePlatforms
        eyebrow={null}
        title={title}
        subtitle={null}
        limit={tiles.length || limit}
        items={tiles.length ? null : items}
        pages={tiles}
      />
    </div>
  );
}

export default PlatformsSection;
