import { FEATURED_PLATFORM_GAMES } from '../../config/featuredPlatformGames';

// Spinzy-style "Providers" marquee built from the real platform list.
export function SpinzyProviders() {
  const items = FEATURED_PLATFORM_GAMES.slice(0, 14);
  const loop = [...items, ...items];
  return (
    <section className="spz-providers" aria-label="Game providers">
      <h2 className="spz-section-title">Providers</h2>
      <div className="spz-providers__viewport">
        <div className="spz-providers__track">
          {loop.map((p, i) => (
            <div className="spz-providers__card" key={`${p.name}-${i}`} aria-hidden={i >= items.length}>
              <img src={p.image_url} alt={p.name} loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default SpinzyProviders;
