import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import * as vipApi from '../../api/vip';
import { usePageContentReady } from '../../context/PageReadyContext';
import { getVipTierImage } from '../../utils/vipTierColors';
import './vip-page.css';

const TIER_NAMES = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
const TIER_DIR = '/vip/tier';
const ROW_DIR = `${TIER_DIR}/rows`;

/** Medal artwork per tier (reference design); falls back to the shared tier image for unknown names. */
function tierMedal(name) {
  const key = String(name || '').toLowerCase();
  return TIER_NAMES.some((t) => t.toLowerCase() === key) ? `${TIER_DIR}/legacy/${key}.webp` : getVipTierImage(name);
}

const FALLBACK_FAQ = [
  { id: 1, question: 'Why should I become a VIP Club member?', answer: 'Once you join, your gaming experience will soar to new heights. You will benefit from weekly Coins Back, rewards for each level-up, and special privileges that unlock as you progress in VIP Club.' },
  { id: 2, question: 'How do I join VIP Club?', answer: "You don't need to sign up separately — every player is automatically part of the VIP Club. Play your favorite games to earn VIP Points (XP); as your XP grows you move up the ranks and unlock bigger rewards." },
  { id: 3, question: 'How do I benefit from leveling up?', answer: 'Every new level brings instant level-up rewards, and higher tiers unlock larger recurring bonuses, higher withdrawal limits, wheel rewards, priority payouts and more.' },
  { id: 4, question: 'What are Exclusive Offers?', answer: 'Exclusive Offers are special promotions, packages and bonuses available only to VIP members at qualifying tiers.' },
  { id: 5, question: 'What does having a VIP Manager mean?', answer: 'At the highest tiers you get a dedicated VIP Manager — a personal point of contact who helps with anything you need and keeps you up to date with offers tailored to you.' },
  { id: 6, question: 'What is Early access?', answer: 'Early access lets high-tier VIP members try new games and features before they are released to everyone else.' },
  { id: 7, question: 'How long will I keep my level?', answer: 'Your level stays with you as long as you stay active. Earn at least one level every two months to keep your current rank and its benefits.' },
];

const fmt = (n) => (Number(n) || 0).toLocaleString();

const PERKS = [
  { icon: `${TIER_DIR}/vip-tier-create-account.webp`, title: 'Create an Account', text: (<><span className="vipTier__hl">Join the Club</span> and become part of the VIP Rank Program</>) },
  { icon: `${TIER_DIR}/vip-tier-engage.webp`, title: 'Deposit & Refer', text: (<>Deposits and referral rewards earn <span className="vipTier__hl">VIP Points</span> and boost your Rank</>) },
  { icon: `${TIER_DIR}/vip-tier-earn-ranks.webp`, title: 'Earn Ranks, Get Rewards', text: 'Each Rank has its own rewards that are simple and easy to claim' },
];

const PLATFORMS = [
  ['Orion Stars', 'orion-stars'], ['Fire Kirin', 'fire-kirin'], ['Game Vault', 'game-vault'], ['Juwa 777', 'juwa'],
  ['Cash Machine', 'cash-machine'], ['Mafia', 'mafia'], ['Panda Master', 'panda-master'], ['Milky Way', 'milky-way'],
  ['Joker', 'joker'], ['Ultra Panda', 'ultra-panda'], ['Mega Spin', 'mega-spin'], ['Golden Dragon', 'golden-dragon'],
];
/* placeholder redemption feed — replace with real data when an endpoint exists */
const REDEMPTIONS = [
  ['rzuyf*****@gmail.com', '271.42', 'Orion Stars', 'orion-stars'],
  ['mkaa7*****@yahoo.com', '120.00', 'Fire Kirin', 'fire-kirin'],
  ['dj_ro*****@gmail.com', '540.75', 'Game Vault', 'game-vault'],
  ['lucky*****@outlook.com', '89.10', 'Juwa 777', 'juwa'],
  ['sam99*****@gmail.com', '312.00', 'Cash Machine', 'cash-machine'],
  ['vegas*****@gmail.com', '205.55', 'Mafia', 'mafia'],
];

const Sc = ({ value }) => <span className="vipTier__rowCoin">{fmt(value)} SC</span>;

/** Only values the backend returns per level; nothing is invented here. */
function buildRows(level) {
  return [
    { icon: `${ROW_DIR}/vip-tier-level-up.svg`, label: 'Level Up Bonus', value: level?.level_up_reward_sc != null ? <Sc value={level.level_up_reward_sc} /> : '—' },
    { icon: `${ROW_DIR}/vip-tier-daily-withdrawal.svg`, label: 'Daily Withdrawal', value: <span className="vipTier__rowText">{level?.withdrawal_limit != null ? fmt(level.withdrawal_limit) : '—'}</span> },
    { icon: `${ROW_DIR}/vip-tier-platform-daily-wd.svg`, label: 'Platform Daily WD', value: <span className="vipTier__rowText">{level?.platform_withdrawal_limit != null ? fmt(level.platform_withdrawal_limit) : '—'}</span> },
  ];
}

export function AccountVip() {
  const { toast } = useToast();
  const [status, setStatus] = useState(null);
  const [faq, setFaq] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pickedIdx, setPickedIdx] = useState(null);

  usePageContentReady(!loading);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, f] = await Promise.all([vipApi.getVipStatus(), vipApi.getVipFaq()]);
      setStatus(s);
      setFaq(f.faq || []);
    } catch (e) {
      toast.error(e.message || 'Unable to load VIP. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
    const onRefresh = () => load();
    window.addEventListener('vip:refresh', onRefresh);
    return () => window.removeEventListener('vip:refresh', onRefresh);
  }, [load]);

  const levels = useMemo(() => {
    const api = status?.levels;
    if (Array.isArray(api) && api.length) return api;
    return TIER_NAMES.map((name) => ({ name }));
  }, [status]);

  const currentIdx = useMemo(() => {
    const i = levels.findIndex((l) => l.is_current);
    if (i >= 0) return i;
    const byName = levels.findIndex((l) => String(l.name).toLowerCase() === String(status?.level_name || 'iron').toLowerCase());
    return byName >= 0 ? byName : 0;
  }, [levels, status]);


  const current = levels[currentIdx];
  const nextLevel = levels[currentIdx + 1];
  const curXp = Number(status?.current_xp) || 0;
  const nextXp = Number(status?.next_level_xp) || 500;
  const pct = Math.min(100, nextXp > 0 ? (100 * curXp) / nextXp : 0);
  const faqItems = faq.length ? faq : FALLBACK_FAQ;
  const selectedIdx = pickedIdx != null && pickedIdx < levels.length ? pickedIdx : currentIdx;
  const featureRows = buildRows(levels[selectedIdx]);

  return (
    <main className="vipTier-wrapper">
      <div className="vipTier__wrapper_main">
        <section className="vipTier__hero">
          <div className="vipTier__heroGraphic" aria-hidden="true">
            <img src={`${TIER_DIR}/vip-tier-image.webp`} alt="" width="900" height="750" loading="eager" fetchpriority="high" />
          </div>
          <div className="vipTier__heroContent">
            <h1 className="vipTier__heroTitle">VIP RANKS</h1>
            <p className="vipTier__heroSubtitle">
              Level up your rank to earn level-up rewards and unlock higher withdrawal limits.
            </p>
            <div className="vipTier__heroActions">
              <Link to="/store" className="vipTier__btn vipTier__btn--gold">Visit Store</Link>
              <button
                type="button"
                className="vipTier__btn vipTier__btn--outline"
                onClick={() => document.getElementById('vip-tier-level')?.scrollIntoView({ behavior: 'smooth' })}
              >
                View Rank
              </button>
            </div>
          </div>
        </section>

        <section className="vipTier__section">
          <div className="vipTier__sectionBanner"><h3>VIP Perks</h3></div>
          <div className="vipTier__perksViewport">
          <div className="vipTier__perksContainer">
            {PERKS.map((p) => (
              <div key={p.title} className="vipTier__perkCard">
                <div className="vipTier__perkIcon" aria-hidden="true"><img src={p.icon} alt="" width="234" height="234" loading="lazy" /></div>
                <h4 className="vipTier__perkTitle">{p.title}</h4>
                <p className="vipTier__perkText">{p.text}</p>
              </div>
            ))}
          </div>
          </div>
        </section>

        <section className="vipTier__section vipTier__section--level">
          <div className="vipTier__levelRow">
            <div className="vipTier__currentCard">
              <div className="vipTier__currentCardBg" />
              <div className="vipTier__currentTop">
                <div className="vipTier__currentMedal">
                  <img src={tierMedal(current?.name)} alt="" width="122" height="122" />
                </div>
                <div className="vipTier__currentInfo">
                  <h3 className="vipTier__currentName">{current?.name || 'Iron'}</h3>
                  <span className="vipTier__currentLabel">Current level</span>
                </div>
                {nextLevel && (
                  <div className="vipTier__currentBadge">
                    <img src={tierMedal(nextLevel.name)} alt={nextLevel.name} width="80" height="80" />
                  </div>
                )}
              </div>
              <div className="vipTier__progress">
                <div className="vipTier__progressTrack" role="progressbar" aria-label="VIP progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
                  <div className="vipTier__progressFill" style={{ width: `${pct}%` }}>
                    <span className="vipTier__progressKnob" />
                  </div>
                </div>
                <div className="vipTier__progressMeta">
                  <span className="vipTier__progressXp">
                    <b>{fmt(curXp)}</b>
                    <span className="vipTier__progressXp--muted"> / {fmt(nextXp)}</span>
                  </span>
                  {nextLevel && <span className="vipTier__progressNext">Next Level: <b>{nextLevel.name}</b></span>}
                </div>
              </div>
            </div>

            <div className="vipTier__earnCard">
              <h3 className="vipTier__earnTitle">Turn Every Deposit Into VIP Points and Every Point Into Something Bigger.</h3>
              <div className="vipTier__earnGrid">
                <div className="vipTier__earnItem">
                  <img src={`${TIER_DIR}/vip-tier-sweep-stack.webp`} alt="" width="140" height="140" loading="lazy" />
                  <p><span className="vipTier__hl">1 SC</span> Deposited = 1 XP (VIP Points)</p>
                </div>
                <div className="vipTier__earnItem">
                  <img src={`${TIER_DIR}/vip-tier-sweep-stack.webp`} alt="" width="140" height="140" loading="lazy" />
                  <p><span className="vipTier__hl">1 SC</span> Earned from Referral Rewards = 1 XP (VIP Points)</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="vipTier__section" id="vip-tier-level">
          <div className="vipTier__tierLevelPanel">
            <div className="vipTier__tierTitleContainer">
              <h3 className="vipTier__tierLevelTitle">Tier Level</h3>
              <div className="vipTier__selector">
                {levels.map((l, i) => (
                  <button
                    key={l.name}
                    type="button"
                    className="vipTier__selectorBadge"
                    aria-pressed={i === selectedIdx}
                    onClick={() => setPickedIdx(i)}
                  >
                    <span className="vipTier__selectorBadgeImg" data-tier={String(l.name).toLowerCase()}>
                      <img src={tierMedal(l.name)} alt="" width="80" height="80" loading="lazy" />
                    </span>
                    <span className="vipTier__selectorBadgeName">{l.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="vipTier__featurePanel">
              {featureRows.map((row) => (
                <div key={row.label} className="vipTier__featureRow">
                  <div className="vipTier__featureRow__label">
                    <img src={row.icon} alt="" width="16" height="16" loading="lazy" />
                    <span>{row.label}</span>
                  </div>
                  <div className="vipTier__featureRow__value">{row.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="vipTier__section">
          <h3 className="vipTier__faqTitle">FAQ</h3>
          <div className="vipTier__faqList">
            {faqItems.map((item, i) => (
              <details key={item.id ?? i} className="vipTier__faqItem" open={i === 0}>
                <summary>{item.question}</summary>
                <div className="vipTier__faqBody"><p>{item.answer}</p></div>
              </details>
            ))}
          </div>
        </section>
        {/* <section className="vipTier__section vipTier__section--wide">
          <h3 className="vipTier__platformsTitle">EXCLUSIVE PLATFORMS</h3>
          <div className="vipTier__sweepBanner">
            <div className="vipTier__sweepText">
              <span className="vipTier__sweepSmall">PLAY &amp; WIN WITH</span>
              <span className="vipTier__sweepBig">SWEEP COINS</span>
            </div>
          </div>
          <div className="vipTier__marquee">
            <div className="vipTier__marqueeTrack">
              {[...REDEMPTIONS, ...REDEMPTIONS].map(([mail, amt, name, slug], i) => (
                <div key={i} className="vipTier__redeem">
                  <img src={`/df-online/platforms/${slug}.webp`} alt="" className="vipTier__redeemLogo" loading="lazy" />
                  <p className="vipTier__redeemMail">{mail}</p>
                  <p className="vipTier__redeemAmt">Redeemed {amt}</p>
                  <p className="vipTier__redeemName">In {name}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="vipTier__platformGrid">
            {PLATFORMS.map(([name, slug]) => (
              <Link key={slug} to="/casino" className="vipTier__platformTile" aria-label={name}>
                <img src={`/df-online/platforms/${slug}.webp`} alt={name} loading="lazy" />
                <span className="vipTier__signup">SIGN UP</span>
              </Link>
            ))}
          </div>
        </section> */}
      </div>
    </main>
  );
}
