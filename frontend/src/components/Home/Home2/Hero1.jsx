import { homeConfig } from '../../../config/homeConfig';
import { PillButton } from './PillButton';

export function Hero1() {
  const cfg = homeConfig.hero1;
  return (
    <section className="df-home2-hero1">
      <picture>
        <source media="(min-width: 768px)" srcSet={cfg.bgDesktop} />
        <img
          className="df-home2-hero1__bg"
          src={cfg.bgMobile}
          alt=""
          draggable="false"
          loading="eager"
          fetchPriority="high"
        />
      </picture>
      <div className="df-home2-hero1__content">
        {cfg.logo ? <img className="df-home2-hero1__logo" src={cfg.logo} alt="" /> : null}
        <div className="df-home2-hero1__offer-block">
          <p className="df-home2-hero1__eyebrow">{cfg.eyebrow}</p>
          <p className="df-home2-hero1__offer">{cfg.offer}</p>
          <PillButton to={cfg.ctaHref} variant="solid" className="df-home2-hero1__cta">
            {cfg.ctaLabel}
          </PillButton>
        </div>
      </div>
    </section>
  );
}

export default Hero1;
