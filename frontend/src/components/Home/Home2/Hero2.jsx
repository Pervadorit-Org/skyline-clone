import { Link } from 'react-router-dom';
import { useHomeConfig } from '../../../config/homeConfigContext';

// Full-width "Play - Win - Redeem" promo: the artwork carries its own copy and
// CTA, so the whole banner is one link.
export function Hero2() {
  const homeConfig = useHomeConfig();
  const cfg = homeConfig.hero2;
  return (
    <section className="df-home2-hero2">
      <Link to={cfg.href} className="df-home2-hero2__link">
        <picture>
          <source media="(min-width: 768px)" srcSet={cfg.imageDesktop} width="1679" height="663" />
          <img src={cfg.imageMobile} alt={cfg.alt} width="860" height="934" draggable="false" loading="lazy" decoding="async" />
        </picture>
      </Link>
    </section>
  );
}

export default Hero2;
