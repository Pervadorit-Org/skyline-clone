import { homeConfig } from '../../../config/homeConfig';

export function ProviderStrip() {
  const { title, logos } = homeConfig.providers;
  const loop = [...logos, ...logos];
  return (
    <section className="df-home2-section df-home2-providers" aria-label={title}>
      <h2 className="df-home2-heading__title df-home2-heading__title--upper">{title}</h2>
      <div className="df-home2-providers__viewport">
        <div className="df-home2-providers__track">
          {loop.map((p, i) => (
            <div className="df-home2-providers__tile" key={`${p.name}-${i}`} aria-hidden={i >= logos.length}>
              <img src={p.image} alt={p.name} loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ProviderStrip;
