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
          <source media="(min-width: 768px)" srcSet={cfg.imageDesktop} />
          <img src={cfg.imageMobile} alt={cfg.alt} draggable="false" loading="eager" />
        </picture>
      </Link>
    </section>
  );
}

export default Hero2;
