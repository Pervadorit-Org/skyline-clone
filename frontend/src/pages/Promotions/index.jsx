import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { usePageContentReady } from '../../context/PageReadyContext';
import { getAffiliateStats } from '../../api/affiliate';
import { getDailyBonusStatus } from '../../api/dailyBonus';
import { buildReferralLink } from '../../utils/referralLink';
import './promotions-page.css';

const GOLD_COIN = '/icons/coin.png';
const SWEEP_COIN = '/df-online/sc-coin.webp';
const DRAGON = '/df-online/dragons/tier-hatchling.webp';

/** Milliseconds until the next 00:00 UTC (the daily reward reset). */
function msUntilUtcMidnight(now = new Date()) {
  const end = new Date(now);
  end.setUTCHours(24, 0, 0, 0);
  return end - now;
}

function formatTimeLeft(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${m}m ${s}s`;
}

function CtaLink({ to, children }) {
  return (
    <Link to={to} className="promotion-card-cta gold-gradient">
      {children}
    </Link>
  );
}

function CtaButton({ onClick, children }) {
  return (
    <button type="button" onClick={onClick} className="promotion-card-cta gold-gradient">
      {children}
    </button>
  );
}

function Coins({ gold, sweep }) {
  return (
    <div className="promotion-card-coins">
      <div className="promo-flex">
        <img src={GOLD_COIN} alt="" aria-hidden="true" className="promotion-card-coin-icon" />
        <span className="promotion-card-coin-amount">{gold}</span>
      </div>
      <div className="promo-flex">
        <img src={SWEEP_COIN} alt="" aria-hidden="true" className="promotion-card-coin-icon" />
        <div className="promo-flex promo-gap">
          <span className="promotion-card-coin-amount">{sweep}</span>
          <div className="promotion-card-coin-label">
            <p>Free</p>
            <p>Sweep Coins</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, plain }) {
  return (
    <h3 className={`promotion-card-badge${plain ? ' promotion-card-badge-plain' : ''}`}>
      {children}
    </h3>
  );
}

export function Promotions() {
  const { toast } = useToast();
  const [referralLink, setReferralLink] = useState('');
  const [timeLeft, setTimeLeft] = useState(() => msUntilUtcMidnight());
  // Real progress from the backend (null until loaded, or when daily rewards are off for this store).
  const [dailyClaims, setDailyClaims] = useState(null);

  usePageContentReady(true);

  useEffect(() => {
    let cancelled = false;
    getAffiliateStats()
      .then((stats) => {
        if (!cancelled) setReferralLink(stats?.referral_link || buildReferralLink(stats?.referral_code));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getDailyBonusStatus({ start: false })
      .then((status) => {
        if (cancelled || !status?.available) return;
        setDailyClaims(status.campaign?.claims_count ?? 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(msUntilUtcMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  const copyLink = async () => {
    if (!referralLink) {
      toast.error('Referral link is not ready yet.');
      return;
    }
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success('Referral link copied!');
    } catch {
      toast.error('Could not copy link.');
    }
  };

  return (
    <main className="promotions-page">
      <h1 className="promotions-title">Promotions</h1>
      <img src="/df-online/tour-mascot.webp" alt="" aria-hidden="true" className="promotions-title-image" />

      <section>
        <h2 className="promotions-subtitle">Latest Promotions</h2>
        <div className="promotions-grid">
          {/* 1. VIP */}
          <article className="promotion-card vip-card">
            <span className="promo-ribbon">Free</span>
            <div className="promo-art promo-art-vip" aria-hidden="true">
              <svg viewBox="0 0 120 140" width="100%" height="100%">
                <polygon points="60,4 76,28 104,22 98,52 118,70 94,86 96,116 66,108 60,136 48,108 20,116 24,86 2,70 22,52 16,22 44,28" fill="#f5b52b" />
                <circle cx="60" cy="70" r="40" fill="#b96b1c" />
                <circle cx="60" cy="70" r="34" fill="#8a4a12" />
                <path d="M36 62l12 14 12-22 12 22 12-14-4 28H40z" fill="#ffe28a" />
                <text x="60" y="108" textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff">VIP</text>
              </svg>
            </div>
            <div className="promotion-card-body">
              <div className="promotion-card-head">
                <Badge>VIP CLUB MEMBERS ONLY</Badge>
                <div className="promotion-card-description"><p>Get max rewards.</p></div>
              </div>
              <Coins gold="200,000" sweep="20" />
              <div className="promotion-card-actions">
                <CtaLink to="/store">Get NOW $19.99</CtaLink>
              </div>
            </div>
          </article>

          {/* 2. Welcome bundle */}
          <article className="promotion-card welcome-card">
            <div className="promo-art promo-art-wheel" aria-hidden="true">
              <span>67%</span>
            </div>
            <div className="promotion-card-body">
              <div className="promotion-card-head">
                <Badge>EXCLUSIVE WELCOME BUNDLE</Badge>
                <div className="promotion-card-description"><p>UP TO</p></div>
              </div>
              <Coins gold="900,000" sweep="30" />
              <div className="promotion-card-actions">
                <CtaLink to="/store">SHOW MORE</CtaLink>
                <p className="promotion-card-price">was $30.00</p>
              </div>
            </div>
          </article>

          {/* 3. Key to the city */}
          <article className="promotion-card special-offer-card">
            <div className="promo-art promo-art-statue" aria-hidden="true">
              <span className="promo-sparkle">✦</span>
              <svg viewBox="0 0 100 160" width="100%" height="100%">
                <path d="M62 8l4 16-8-2z" fill="#ffd54a" />
                <rect x="58" y="22" width="6" height="40" fill="#6d93f2" />
                <circle cx="52" cy="58" r="12" fill="#6d93f2" />
                <path d="M34 70h36l10 80H24z" fill="#5b82e8" />
                <rect x="14" y="96" width="22" height="30" rx="3" fill="#7da3ff" />
              </svg>
            </div>
            <div className="promotion-card-body">
              <div className="promotion-card-head">
                <Badge>BEST DEAL - 200% EXTRA COINS</Badge>
                <div className="promotion-card-description promotion-card-description-lg"><p>KEY TO THE CITY</p></div>
              </div>
              <div className="promotion-card-actions">
                <CtaLink to="/store">BUY NOW $24.99</CtaLink>
              </div>
            </div>
          </article>

          {/* 4. Special offer */}
          <article className="promotion-card daily-express-card">
            <div className="promo-art promo-art-disco" aria-hidden="true" />
            <span className="promo-sparkle promo-sparkle-a" aria-hidden="true">✦</span>
            <span className="promo-sparkle promo-sparkle-b" aria-hidden="true">✦</span>
            <div className="promotion-card-body">
              <div className="promotion-card-head">
                <Badge>MOST POPULAR - 350% EXTRA COINS</Badge>
                <div className="promotion-card-description promotion-card-description-lg"><p>Your Special Offer</p></div>
              </div>
              <div className="promotion-card-actions">
                <CtaLink to="/store">BUY NOW $7.99</CtaLink>
              </div>
            </div>
          </article>

          {/* 5. Invite friends */}
          <article className="promotion-card invite-card">
            <img src={DRAGON} alt="" aria-hidden="true" className="promo-art promo-art-dragon" />
            <div className="promotion-card-body">
              <div className="promotion-card-head">
                <Badge>INVITE FRIENDS PROGRAM</Badge>
                <div className="promo-referral">
                  <p className="promotion-card-description">Share the Rewards!</p>
                  <p className="promotion-card-referral-up-to">Up to</p>
                  <div className="promo-flex promo-gap">
                    <span className="promotion-card-referral-amount">10%</span>
                    <div className="promotion-card-referral-label">
                      <p>Of their first</p>
                      <p>3 purchases</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="promotion-card-actions">
                <CtaButton onClick={copyLink}>Copy Link</CtaButton>
              </div>
            </div>
          </article>

          {/* 6. Daily express */}
          <article className="promotion-card city-card">
            <span className="promo-ribbon">Free</span>
            <div className="promo-art promo-art-calendar" aria-hidden="true">
              <span>30</span>
            </div>
            <div className="promotion-card-body">
              <div className="promotion-card-head">
                <Badge plain>DAILY EXPRESS</Badge>
                <div className="promotion-card-description promotion-card-description-daily"><p>Claim Rewards Every Day!</p></div>
              </div>
              <div className="promotion-card-streak">
                <p id="promo-streak-days" className="promotion-card-streak-days">{dailyClaims ?? 0} / 7 days claimed</p>
                <progress className="promotion-card-streak-bar" aria-labelledby="promo-streak-days" value={dailyClaims ?? 0} max="7" />
                <p className="promotion-card-streak-label">Don&apos;t miss out - time left:</p>
                <p className="promotion-card-streak-timer">{formatTimeLeft(timeLeft)}</p>
              </div>
              <div className="promotion-card-actions">
                <CtaLink to="/daily-bonus">CLAIM REWARD</CtaLink>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
