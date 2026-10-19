import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { usePageContentReady } from '../../context/PageReadyContext';
import { getAffiliateStats } from '../../api/affiliate';
import { getPromotions } from '../../api/promotions';
import { buildReferralLink } from '../../utils/referralLink';
import './promotions-page.css';

const DRAGON = '/df-online/dragons/tier-hatchling.webp';

/** Card look per promotion slug; unknown slugs use the generic special-offer style. */
const CARD_CLASS = {
  'first-deposit-bonus': 'welcome-card',
  'invite-earn': 'invite-card',
  'unlock-higher-payouts': 'vip-card',
  'spin-the-wheel': 'daily-express-card',
};

function bonusLabel(promo) {
  if (promo.bonus_value == null) return '';
  const v = Number(promo.bonus_value);
  if (!Number.isFinite(v) || v <= 0) return '';
  return promo.bonus_type === 'percentage' ? `${v}%` : `${v} SC`;
}

function PromoCta({ promo, onCopy }) {
  const label = promo.cta_text || 'Learn more';
  if (promo.slug === 'invite-earn') {
    return (
      <button type="button" onClick={onCopy} className="promotion-card-cta gold-gradient">
        Copy Link
      </button>
    );
  }
  const to = promo.cta_url || '/';
  return (
    <Link to={to} className="promotion-card-cta gold-gradient">
      {label}
    </Link>
  );
}

function PromoCard({ promo, onCopy }) {
  const cls = CARD_CLASS[promo.slug] || 'special-offer-card';
  const bonus = bonusLabel(promo);
  return (
    <article className={`promotion-card ${cls}`}>
      {promo.slug === 'invite-earn' ? (
        <img src={DRAGON} alt="" aria-hidden="true" className="promo-art promo-art-dragon" />
      ) : null}
      <div className="promotion-card-body">
        <div className="promotion-card-head">
          <h3 className="promotion-card-badge">{promo.title}</h3>
          {bonus ? (
            <div className="promo-referral">
              <p className="promotion-card-referral-amount">{bonus}</p>
              <p className="promotion-card-referral-label">
                {promo.bonus_trigger_type === 'first_deposit' ? 'Extra on your first deposit' : 'Bonus'}
              </p>
            </div>
          ) : null}
          {promo.description ? (
            <div className="promotion-card-description">
              <p>{promo.description}</p>
            </div>
          ) : null}
        </div>
        <div className="promotion-card-actions">
          <PromoCta promo={promo} onCopy={onCopy} />
        </div>
      </div>
    </article>
  );
}

export function Promotions() {
  const { toast } = useToast();
  const [promotions, setPromotions] = useState(null);
  const [failed, setFailed] = useState(false);
  const [referralLink, setReferralLink] = useState('');

  usePageContentReady(promotions !== null || failed);

  useEffect(() => {
    let cancelled = false;
    getPromotions()
      .then((res) => {
        if (!cancelled) setPromotions(Array.isArray(res?.promotions) ? res.promotions : []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    getAffiliateStats()
      .then((stats) => {
        if (!cancelled) setReferralLink(stats?.referral_link || buildReferralLink(stats?.referral_code));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
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
        {failed ? (
          <p>Could not load promotions. Please try again later.</p>
        ) : promotions && promotions.length === 0 ? (
          <p>No promotions right now. Check back soon.</p>
        ) : (
          <div className="promotions-grid">
            {(promotions || []).map((promo) => (
              <PromoCard key={promo.id} promo={promo} onCopy={copyLink} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
