import { homeConfig } from '../../../config/homeConfig';
import { ImageSlot } from './ImageSlot';
import { PillButton } from './PillButton';

/** Renders homeConfig.banner1 or homeConfig.banner2 — same layout, mirrored by `characterSide`. */
export function PromoBanner({ configKey }) {
  const cfg = homeConfig[configKey];
  if (!cfg) return null;
  const isImageBg = cfg.bg.startsWith('/');
  const style = isImageBg
    ? { backgroundImage: `url(${cfg.bg})` }
    : { background: `var(--df-home2-color-${cfg.bg})` };

  return (
    <section
      className={`df-home2-section df-home2-promo-banner df-home2-promo-banner--${cfg.characterSide} df-home2-${configKey}`}
      style={style}
    >
      <div className="df-home2-promo-banner__text">
        <h2>{cfg.title}</h2>
        <p>{cfg.body}</p>
        <PillButton to={cfg.ctaHref} variant="solid" className="df-home2-promo-banner__cta">
          {cfg.ctaLabel}
        </PillButton>
      </div>
      <picture className="df-home2-promo-banner__picture">
        {cfg.characterMobile ? (
          <source media="(max-width: 1023px)" srcSet={cfg.characterMobile} />
        ) : null}
        <ImageSlot src={cfg.character} alt="" className="df-home2-promo-banner__character" />
      </picture>
    </section>
  );
}

export default PromoBanner;
