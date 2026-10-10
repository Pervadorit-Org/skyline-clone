import { homeConfig } from '../../../config/homeConfig';
import { GuestHomePlatforms } from '../GuestHomePlatforms';

// Reuses the real curated platform-tile data/behavior from GuestHomePlatforms
// (featuredPlatformGames.js) — only heading copy + tile count are config-driven.
export function PlatformsSection() {
  const { title, limit } = homeConfig.platforms;
  return (
    <div className="df-home2-section df-home2-platforms">
      <GuestHomePlatforms eyebrow={null} title={title} subtitle={null} limit={limit} />
    </div>
  );
}

export default PlatformsSection;
