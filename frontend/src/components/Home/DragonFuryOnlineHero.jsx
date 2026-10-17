import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { site } from '../../config/site';

const HERO_FEATURES = [
  { icon: '🎁', label: 'Welcome Rewards' },
  { icon: '⚡', label: 'Fast & Secure Cashouts' },
  { icon: '👑', label: 'VIP Rewards & Daily Bonuses' },
  { icon: '⭐', label: 'Trusted by over 10,000 users' },
];

export function DragonFuryOnlineHero() {
  const { search } = useLocation();
  const registerPath = `/register${search || ''}`;
  const loginPath = `/login${search || ''}`;

  const logo = useMemo(() => site.logoUrl || '/logo.webp', []);

  return (
    <section className="df-online-hero" aria-label={`${site.platformName} welcome`}>
      <div className="df-online-hero__banner">
        <div className="df-online-hero__copy">
          <h1 className="df-online-hero__headline">
            YOUR GAME.
            <br />
            YOUR WINNINGS.
          </h1>
          <p className="df-online-hero__subtitle">Buy Credits. Play Big. Cash Out Real.</p>
          <div className="df-online-hero__cta">
            <Link to={registerPath} className="df-pill df-pill--signup">
              <span>Sign Up</span>
            </Link>
            <Link to={loginPath} className="df-pill df-pill--login">
              <span>Login</span>
            </Link>
          </div>
        </div>
        <div className="df-online-hero__art">
          <img
            className="df-online-hero__logo"
            src={logo}
            alt={site.platformName || 'Golden Dragon Casino'}
            width={460}
            height={348}
            decoding="async"
            fetchpriority="high"
          />
        </div>
      </div>

      <ul className="df-hero-features" aria-label={`Why ${site.platformName}`}>
        {HERO_FEATURES.map((feature) => (
          <li key={feature.label} className="df-hero-feature">
            <span className="df-hero-feature__icon" aria-hidden>
              {feature.icon}
            </span>
            <span className="df-hero-feature__label">{feature.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
