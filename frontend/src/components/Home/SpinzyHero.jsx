import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useVipStatus } from '../../context/VipStatusContext';

// Spinzy-style hero band: a promo carousel (left) + two stacked side cards (right).
// Content & routes are DragonFury's own; visuals use existing /df-online art.
const SLIDES = [
  {
    key: 'welcome',
    line1: 'Sign up and',
    line2: 'claim up to',
    amount: '15,000',
    amountUnit: 'SC',
    cta: 'Get bonus',
    to: '/store',
    guestTo: '/register',
    image: '/df-online/dragons/tier-dragon-lord.webp',
    variant: 'welcome',
  },
  {
    key: 'referral',
    line1: 'Referral',
    line2: 'bonus',
    subtitle: 'Invite friends and earn extra coins',
    cta: 'Get bonus',
    to: '/refer',
    guestTo: '/register',
    image: '/df-online/referral-invite.webp',
    variant: 'referral',
  },
  {
    key: 'rakeback',
    line1: 'Daily',
    line2: 'rewards',
    subtitle: 'Earn rewards on every play',
    cta: 'Get bonus',
    to: '/spin',
    guestTo: '/register',
    image: '/df-online/dragons/tier-fury.webp',
    variant: 'rakeback',
  },
];

export function SpinzyHero() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const vip = useVipStatus();
  const vipStatus = vip?.vipStatus || null;
  const slideTarget = (s) => (isAuthenticated ? s.to : s.guestTo || '/register');
  const bonusTarget = isAuthenticated ? '/bonus' : '/register';

  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);
  const count = SLIDES.length;

  const go = useCallback((next) => {
    setIndex((prev) => ((next % count) + count) % count);
  }, [count]);

  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % count);
    }, 6000);
    return () => window.clearInterval(timerRef.current);
  }, [count]);

  const pause = () => window.clearInterval(timerRef.current);

  const tierLabel = vipStatus?.currentTier?.name || vipStatus?.tierName || 'VIP';

  return (
    <div className="spz-hero" onMouseEnter={pause}>
      <div className="spz-hero__main">
        <div className="spz-hero__viewport">
          <div
            className="spz-hero__track"
            style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
          >
            {SLIDES.map((s) => (
              <div className={`spz-hero__slide spz-hero__slide--${s.variant}`} key={s.key}>
                <img className="spz-hero__art" src={s.image} alt="" loading="eager" />
                <div className="spz-hero__content">
                  <p className="spz-hero__title">
                    <span>{s.line1}</span>
                    <span>{s.line2}</span>
                  </p>
                  {s.amount ? (
                    <div className="spz-hero__amount">
                      <span className="spz-hero__amount-num">{s.amount}</span>
                      <span className="spz-hero__amount-unit">{s.amountUnit}</span>
                    </div>
                  ) : (
                    <p className="spz-hero__subtitle">{s.subtitle}</p>
                  )}
                  <button
                    type="button"
                    className="spz-btn spz-btn--gold"
                    onClick={() => navigate(slideTarget(s))}
                  >
                    {s.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="spz-hero__dots" role="tablist" aria-label="Promotions">
          {SLIDES.map((s, i) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Go to slide ${i + 1}`}
              className={`spz-dot ${i === index ? 'spz-dot--active' : ''}`}
              onClick={() => go(i)}
            />
          ))}
        </div>

        <div className="spz-hero__arrows">
          <button type="button" aria-label="Previous slide" className="spz-arrow" onClick={() => go(index - 1)}>
            ‹
          </button>
          <button type="button" aria-label="Next slide" className="spz-arrow" onClick={() => go(index + 1)}>
            ›
          </button>
        </div>
      </div>

      <div className="spz-hero__side">
        <button
          type="button"
          className="spz-side-card spz-side-card--level"
          onClick={() => navigate(bonusTarget)}
        >
          <div className="spz-side-card__text">
            <span className="spz-side-card__title">Level Up Bonus</span>
            <p>
              Unlock {tierLabel} rewards
              <br />
              as you climb
            </p>
          </div>
          <img className="spz-side-card__img" src="/df-online/dragons/tier-elder-dragon.webp" alt="" loading="lazy" />
        </button>

        <button
          type="button"
          className="spz-side-card spz-side-card--bonus"
          onClick={() => navigate(bonusTarget)}
        >
          <div className="spz-side-card__text">
            <span className="spz-side-card__title">Bonuses</span>
            <div className="spz-side-card__avail">
              <span className="spz-dot-live" />
              <span>Daily rewards available</span>
            </div>
          </div>
          <img className="spz-side-card__img" src="/df-online/menu/menu-bonus.webp" alt="" loading="lazy" />
        </button>
      </div>
    </div>
  );
}

export default SpinzyHero;
