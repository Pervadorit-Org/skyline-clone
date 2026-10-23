import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useLobbyShell } from '../../hooks/useLobbyShell';
import * as walletApi from '../../api/wallet';
import * as kycApi from '../../api/kyc';
import { fetchNormalizedDepositPackagesCatalog } from '../../api/depositPackages';
import { applyDiscountCode, getAppliedDiscountCode, removeDiscountCode } from '../../api/emailCampaigns';
import { lockBodyScroll } from '../../utils/bodyScrollLock';
import { isGcPackage } from '../../utils/storeChest';
import { OPEN_STORE_EVENT, STORE_TABS, consumePendingStoreOpen, setStoreModalOpen } from './storeModalEvents';
import './store-modal.css';

const TAB_LABELS = { buy: ['Buy', 'Buy'], redeem: ['Redeem', 'Redeem'], bonus: ['Bonus', 'Bonus'] };

/** 20000 -> "20K", 1500000 -> "1.5M". */
function formatGc(value) {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const formatSc = (value) => String(+(Number(value) || 0).toFixed(2));
/** Whole dollars show without cents ($19), others with two decimals ($9.50), like the reference. */
const formatUsd = (value) => {
  const n = Number(value) || 0;
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
};

/**
 * Deal boxes with no admin end time still count down, like the reference: Daily Deals to the end of today (UTC),
 * Weekly Deals to the end of this week (Sunday, UTC). An end time set on the package group wins.
 */
function fallbackDealEnd(kind) {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  if (kind === 'weekly') end.setUTCDate(end.getUTCDate() + ((7 - end.getUTCDay()) % 7));
  return end.toISOString();
}

function useCountdown(endsAt) {
  const target = endsAt ? new Date(endsAt).getTime() : 0;
  const calc = () => Math.max(0, target - Date.now());
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    if (!target) return undefined;
    setLeft(calc());
    const id = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  if (!target || left <= 0) return null;
  const s = Math.floor(left / 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return {
    Day: pad(Math.floor(s / 86400)),
    Hours: pad(Math.floor((s % 86400) / 3600)),
    Min: pad(Math.floor((s % 3600) / 60)),
    Sec: pad(s % 60),
  };
}

const GOLD_COIN = '/ref/images/gold-coin.webp';
const SWEEP_COIN = '/ref/images/sweep-coin.webp';
const WELCOME_CHESTS = ['/ref/store/offer/chest-yellow.webp', '/ref/store/offer/chest-purple.webp', '/ref/store/offer/chest-red.webp'];

function Coin({ kind, className = '' }) {
  return <img src={kind === 'gc' ? GOLD_COIN : SWEEP_COIN} alt="" aria-hidden="true" width="24" height="24" loading="lazy" decoding="async" className={`sm-coin ${className}`} />;
}

function Price({ pkg }) {
  const was = Number(pkg.actual_price);
  const now = Number(pkg.final_price);
  return (
    <span className="sm-price">
      {was > now ? <span className="sm-price__strike">{formatUsd(was)}</span> : null}
      <span>{formatUsd(now)}</span>
    </span>
  );
}

function pkgAmount(pkg) {
  // GC stores sell Gold Coins (gc_coin) and give final_sc as free SC; SC-only stores sell final_sc.
  return isGcPackage(pkg)
    ? { main: formatGc(pkg.gc_coin), mainKind: 'gc', free: formatSc(pkg.final_sc), hasFree: true }
    : { main: formatSc(pkg.final_sc), mainKind: 'sc', free: null, hasFree: false };
}

function WelcomeCard({ pkg, index, onPick }) {
  const a = pkgAmount(pkg);
  return (
    <div className="sm-welcome__slot">
      <button type="button" className="sm-pack sm-pack--welcome" onClick={() => onPick(pkg)}>
        <div className="sm-pack__in sm-pack__in--welcome">
          <img src={WELCOME_CHESTS[index % WELCOME_CHESTS.length]} alt="" width="147" height="142" className="sm-chest" />
          <div className="sm-welcome-amt"><Coin kind={a.mainKind} className="sm-coin--w" /><span>{a.main}</span></div>
          {a.hasFree ? (
            <div className="sm-welcome-free"><span>+ Free</span><Coin kind="sc" className="sm-coin--w" /><span>{a.free}</span></div>
          ) : null}
        </div>
        <Price pkg={pkg} />
      </button>
    </div>
  );
}

function Timer({ endsAt }) {
  const t = useCountdown(endsAt);
  if (!t) return null;
  const entries = Object.entries(t);
  return (
    <div className="sm-timer" role="timer">
      {entries.map(([label, value], i) => (
        <span className="sm-timer__seg" key={label}>
          <span className="sm-timer__col">
            <span className="sm-timer__box"><span className="sm-stroke-dark sm-timer__num">{value}</span></span>
            <span className="sm-stroke-dark sm-timer__label">{label}</span>
          </span>
          {i < entries.length - 1 ? <span className="sm-stroke-dark sm-timer__colon">:</span> : null}
        </span>
      ))}
    </div>
  );
}

function BundleSection({ title, variant, endsAt, packages, onPick }) {
  return (
    <div className={`sm-bundle sm-bundle--${variant}`}>
      <div className="sm-bundle__head">
        <h3 className="sm-bundle__title">
          <span aria-hidden="true" className="sm-bundle__title-outline">{title}</span>
          <span className="sm-bundle__title-fill">{title}</span>
        </h3>
        <Timer endsAt={endsAt} />
      </div>
      <div className={`sm-bundle__grid${packages.length < 3 ? ' sm-bundle__grid--few' : ''}`}>
        {packages.map((pkg) => {
          const a = pkgAmount(pkg);
          return (
            <button key={pkg.id} type="button" className="sm-bpack" onClick={() => onPick(pkg)}>
              <div className="sm-bpack__in">
                <div className="sm-bpack__main"><Coin kind={a.mainKind} className="sm-coin--b" /><span className="sm-stroke">{a.main}</span></div>
                {a.hasFree ? (
                  <>
                    <span className="sm-bpack__free sm-stroke">+ FREE SC</span>
                    <div className="sm-bpack__sc"><Coin kind="sc" className="sm-coin--bs" /><span className="sm-stroke">{a.free}</span></div>
                  </>
                ) : null}
                {variant === 'weekly' ? <img src="/ref/store/bundles/lens-flare.webp" alt="" aria-hidden="true" width="160" height="80" className="sm-flare" /> : null}
              </div>
              <Price pkg={pkg} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Package artwork from the reference store, keyed by Gold Coins + free SC; other sizes fall back to the nearest art by Gold Coins. */
const PACK_ICON_BASE = '/ref/pack/';
const PACK_ICONS = {
  '50000-5': '466ae01b-1a3d-40db-9847-d1dcc4f03029.png',
  '100000-10': '4848dacc-3ad3-4950-9271-fd01874d3a9c.png',
  '150000-15': '47e29073-0c48-48fd-948b-644ba076061b.png',
  '200000-20': '5bc785c4-92f7-4387-8348-f0607726de86.png',
  '500000-22': 'ca571b40-e66a-46c3-a4d5-025b6e7b1f04.webp',
  '250000-26': 'b9533e2e-9d33-429a-bdcc-b92845881380.png',
  '300000-30': '3cfeac1a-629d-4f3e-b0d2-dcb70daec80d.png',
  '400000-42': '0cb98808-750f-48b8-ab5f-5bc0790d779a.png',
  '500000-53': '65214703-ebbc-44bb-9a82-435c36dea851.png',
  '750000-78': '30868ec9-c2a8-49ca-bef5-32daedd21dd9.png',
  '1000000-105': '8bab5d4f-020e-4cec-a258-260aa746a2aa.png',
  '1500000-155': '65643901-0e3d-45d1-98df-adc86fc26fff.png',
  '2000000-210': '9ef50dd4-2dde-4b6f-85fe-d55b70c3d1a3.png',
  '3000000-315': '7a9b414c-2a68-4b5c-b443-e80b3f74f469.png',
  '4000000-420': '2e031dc1-8a43-4849-97be-e286224d9f60.png',
  '5000000-530': '848433eb-1ba2-4aa9-814e-01bbe86bb7e1.png',
};
const PACK_ICON_LADDER = [
  [100000, '4848dacc-3ad3-4950-9271-fd01874d3a9c.png'],
  [250000, '47e29073-0c48-48fd-948b-644ba076061b.png'],
  [500000, '3cfeac1a-629d-4f3e-b0d2-dcb70daec80d.png'],
  [1000000, '30868ec9-c2a8-49ca-bef5-32daedd21dd9.png'],
  [Infinity, '9ef50dd4-2dde-4b6f-85fe-d55b70c3d1a3.png'],
];
function packIconSrc(pkg) {
  const gc = Math.round(Number(pkg.gc_coin) || 0);
  if (!gc) {
    // SC-only package: no Gold Coins to key on, so use the art whose free-SC size is closest.
    const sc = Number(pkg.final_sc) || 0;
    if (!sc) return GOLD_COIN;
    const keys = Object.keys(PACK_ICONS).map((k) => [Number(k.split('-')[1]), PACK_ICONS[k]]);
    const nearest = keys.reduce((best, cur) => (Math.abs(cur[0] - sc) < Math.abs(best[0] - sc) ? cur : best));
    return PACK_ICON_BASE + nearest[1];
  }
  const exact = PACK_ICONS[`${gc}-${Math.round(Number(pkg.final_sc) || 0)}`];
  const file = exact || PACK_ICON_LADDER.find(([max]) => gc <= max)[1];
  return PACK_ICON_BASE + file;
}

const BADGE_COLOR = { favorite: '#6c19a2', popular: '#3b82f6' };
function badgeColor(label) {
  return BADGE_COLOR[String(label || '').trim().toLowerCase()] || '#fec602';
}

function GridCard({ pkg, onPick }) {
  const a = pkgAmount(pkg);
  const label = pkg.discount_label;
  const long = a.main.length >= 4; // 1M, 1.5M … use the smaller size
  return (
    <button type="button" className="sm-pack" onClick={() => onPick(pkg)}>
      {label ? (
        <div className="sm-badge">
          <svg width="87" height="26" viewBox="0 0 87 22" fill="none" aria-hidden="true" style={{ color: badgeColor(label) }}>
            <path d="M0 8.39474L43.34 20.5526L86.8421 8.39474L83.9474 0H2.89474L0 8.39474Z" fill="currentColor" />
            <path d="M2.99463 14.9211L43.3403 21L83.8476 14.9211V0H2.99463V14.9211Z" fill="currentColor" />
          </svg>
          <span>{label}</span>
        </div>
      ) : null}
      <div className="sm-pack__in sm-pack__in--grid">
        <div className="sm-gamt"><Coin kind={a.mainKind} className="sm-coin--g" /><span className={long ? 'is-long' : ''}>{a.main}</span></div>
        <img src={packIconSrc(pkg)} alt="" loading="lazy" decoding="async" className="sm-gicon" />
        {a.hasFree ? (
          <div className="sm-gfree"><span>+ FREE SC</span><Coin kind="sc" className="sm-coin--gs" /><b>{a.free}</b></div>
        ) : <div className="sm-gfree" />}
      </div>
      <Price pkg={pkg} />
    </button>
  );
}

function BuyTab({ onPick, shell }) {
  const [state, setState] = useState({ status: 'loading', catalog: null });

  useEffect(() => {
    let cancelled = false;
    fetchNormalizedDepositPackagesCatalog()
      .then((catalog) => !cancelled && setState({ status: 'ready', catalog }))
      .catch(() => !cancelled && setState({ status: 'error', catalog: null }));
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = state.catalog?.groups || [];
  const byKey = (key) => groups.find((g) => String(g.group_key) === key);
  const welcome = byKey('welcome');
  const flash = byKey('flash_sale');
  const limited = byKey('limited_time');
  const gridPacks = [byKey('featured'), byKey('general')].flatMap((g) => g?.packages || []);

  if (state.status === 'loading') return <p className="sm-note">Loading packages…</p>;
  if (state.status === 'error') return <p className="sm-note sm-note--err">Could not load packages. Please try again later.</p>;
  if (!state.catalog?.enabled || groups.length === 0) return <p className="sm-note">No packages are available right now.</p>;

  // Ribbon picture next to the welcome heading (admin can replace it or switch it off), and per-section switches.
  const ribbon = shell.hidden('store', 'ribbon') ? '' : shell.text('store.welcomeBadge', '/ref/store/offer/ribbon.webp');
  const showWelcome = !shell.hidden('store', 'welcome');
  const showLimited = !shell.hidden('store', 'limited');
  const showDaily = showLimited && !shell.hidden('store', 'daily');
  const showWeekly = showLimited && !shell.hidden('store', 'weekly');
  const showGrid = !shell.hidden('store', 'grid');

  return (
    <div className="sm-buy">
      {showWelcome && welcome && welcome.packages?.length ? (
        <section className="sm-welcome">
          <div className="sm-welcome__head">
            {ribbon ? <img src={ribbon} alt="" width="128" height="128" className="sm-welcome__ribbon" /> : null}
            <div className="sm-welcome__copy">
              <h3>{shell.text('store.welcomeTitle', "Haven't Claimed Your Welcome Offer Yet")}</h3>
              <p>{shell.text('store.welcomeSub', 'Choose Wisely - you can only pick one')}</p>
            </div>
          </div>
          <div className="sm-welcome__grid">
            {welcome.packages.map((pkg, i) => <WelcomeCard key={pkg.id} pkg={pkg} index={i} onPick={onPick} />)}
          </div>
        </section>
      ) : null}

      {((showDaily && flash?.packages?.length) || (showWeekly && limited?.packages?.length)) ? (
        <section className="sm-limited">
          <img src="/ref/store/bundles/limited-time.webp" alt={shell.text('store.limitedTitle', 'Limited time offer')} width="316" height="128" className="sm-limited__img" />
          <p className="sm-limited__sub">{shell.text('store.limitedSub', "Don't miss out - these go fast!")}</p>
          {showDaily && flash?.packages?.length ? (
            <BundleSection title={shell.text('store.dailyTitle', 'Daily Deals')} variant="daily"
              endsAt={flash.countdown_ends_at || fallbackDealEnd('daily')} packages={flash.packages} onPick={onPick} />
          ) : null}
          {showWeekly && limited?.packages?.length ? (
            <BundleSection title={shell.text('store.weeklyTitle', 'Weekly Deals')} variant="weekly"
              endsAt={limited.countdown_ends_at || fallbackDealEnd('weekly')} packages={limited.packages} onPick={onPick} />
          ) : null}
        </section>
      ) : null}

      {showGrid && gridPacks.length ? (
        <div className="sm-grid">
          {gridPacks.map((pkg) => <GridCard key={pkg.id} pkg={pkg} onPick={onPick} />)}
        </div>
      ) : null}
    </div>
  );
}

function RedeemTab({ shell, user, onNavigate }) {
  const [data, setData] = useState({ status: 'loading', balance: null, limits: null, kyc: null });

  const load = useCallback(() => {
    return Promise.all([
      walletApi.getBalance(),
      walletApi.getWalletLimits().catch(() => null),
      kycApi.getKycStatus().catch(() => null),
    ])
      .then(([balance, limits, kyc]) => setData({ status: 'ready', balance, limits, kyc }))
      .catch(() => setData((d) => (d.status === 'ready' ? d : { status: 'error', balance: null, limits: null, kyc: null })));
  }, []);

  useEffect(() => {
    load();
    // Balances / limits change after a purchase or redeem elsewhere: reload instead of showing stale numbers.
    window.addEventListener('wallet:refresh', load);
    return () => window.removeEventListener('wallet:refresh', load);
  }, [load]);

  if (data.status === 'loading') return <p className="sm-note">Loading balances…</p>;
  if (data.status === 'error') return <p className="sm-note sm-note--err">Could not load your balances. Please try again later.</p>;

  const { balance, limits, kyc } = data;
  const total = Number(balance?.wallet_balance_sc ?? 0);
  const unplayed = Number(balance?.usable_balance_sc ?? 0);
  const available = Number(balance?.available_to_withdraw_sc ?? 0);

  // Same rules as the Redeem page: bonus-wheel play-through, per-request cap and the daily allowance.
  const currency = limits?.currency || 'SC';
  const withdrawMin = limits?.withdrawMin != null ? Number(limits.withdrawMin) : null;
  const withdrawMax = limits?.withdrawMax != null ? Number(limits.withdrawMax) : null;
  const dailyMax = limits?.dailyWithdrawMax != null && Number(limits.dailyWithdrawMax) > 0 ? Number(limits.dailyWithdrawMax) : null;
  const dailyRemaining = dailyMax != null
    ? Math.max(0, limits?.dailyWithdrawRemaining != null ? Number(limits.dailyWithdrawRemaining) : dailyMax)
    : null;
  const spinMax = balance?.spin_wheel_max_withdraw_sc != null ? Number(balance.spin_wheel_max_withdraw_sc) : available;
  const redeemable = Math.max(0, Math.min(available, spinMax, dailyRemaining != null ? dailyRemaining : Infinity));

  const profileComplete = Boolean(user && (user.firstName || '').trim() && (user.lastName || '').trim());
  const kycRequired = Boolean(kyc?.required);
  const kycBlocking = kycRequired && !Boolean(kyc?.approved);
  const kycPending = kyc?.kycStatus === 'pending' || kyc?.kycStatus === 'in_review';
  const dailyUsedUp = dailyMax != null && dailyRemaining != null && dailyRemaining <= 0;
  const belowMin = withdrawMin != null && redeemable > 0 && redeemable + 0.004 < withdrawMin;

  const rows = [
    [shell.text('store.redeemBalance', 'Sweepstakes Coins Balance'), total, false],
    [shell.text('store.redeemUnplayed', 'Unplayed'), unplayed, false],
    [shell.text('store.redeemRedeemable', 'Redeemable'), redeemable, true],
  ];

  let payout;
  if (!profileComplete) {
    payout = (
      <>
        <p>Complete your profile before redeeming.</p>
        <Link className="sm-gold-btn" to="/settings?returnTo=withdraw" onClick={onNavigate}>Complete profile</Link>
      </>
    );
  } else if (kycBlocking) {
    payout = (
      <>
        <p>
          {kycPending
            ? 'Your verification is in progress. Redeem unlocks as soon as it is approved.'
            : kyc?.kycStatus === 'declined'
              ? (kyc?.declineReason || 'Verification was declined. You can try again with a clear ID photo.')
              : 'A one-time identity check is required before your first redeem.'}
        </p>
        <Link className="sm-gold-btn" to="/redeem" onClick={onNavigate}>{kycPending ? 'View status' : 'Verify identity'}</Link>
      </>
    );
  } else if (dailyUsedUp) {
    payout = <p>You have used your daily allowance of {currency} {formatSc(dailyMax)}. It resets at midnight.</p>;
  } else if (redeemable <= 0) {
    payout = <p>You have no redeemable Sweepstakes Coins yet.</p>;
  } else if (belowMin) {
    payout = <p>The minimum redeem is {currency} {formatSc(withdrawMin)}. You have {formatSc(redeemable)} SC ready.</p>;
  } else {
    payout = (
      <>
        <p>You have {formatSc(redeemable)} SC ready to redeem.</p>
        <Link className="sm-gold-btn" to="/redeem" onClick={onNavigate}>Redeem</Link>
      </>
    );
  }

  return (
    <div className="sm-redeem">
      <div className="sm-panel">
        <p className="sm-redeem__lead">
          {shell.text('store.redeemIntro', 'Sweepstakes Coins can be redeemed for real cash. Sweepstakes Coins must be played at least once before they can be redeemed.')}
        </p>
        <dl className="sm-rows">
          {rows.map(([label, value, hot]) => (
            <div key={label} className="sm-rows__row">
              <dt>{label}</dt>
              <dd><Coin kind="sc" /><b className={hot ? 'is-hot' : ''}>{formatSc(value)} SC</b></dd>
            </div>
          ))}
        </dl>
      </div>
      {dailyMax != null ? (
        <p className="sm-redeem__limit">
          Total payout per day is up to {formatSc(dailyMax)} SC. <Link to="/vip" onClick={onNavigate}>Learn More</Link>
        </p>
      ) : null}
      {limits?.neverDeposited && withdrawMax != null ? (
        <p className="sm-redeem__limit">Your per-request cap is {currency} {formatSc(withdrawMax)} until you make your first purchase.</p>
      ) : null}
      <div className="sm-panel">
        <h3 className="sm-panel__title">{shell.text('store.payoutTitle', 'Payout')}</h3>
        <div className="sm-payout">{payout}</div>
      </div>
      <p className="sm-history"><Link to="/account/transactions" onClick={onNavigate}>Redemption History</Link></p>
    </div>
  );
}

function BonusTab({ shell }) {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getAppliedDiscountCode()
      .then((res) => !cancelled && res?.applied && setApplied(res))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const res = await applyDiscountCode(trimmed);
      setApplied(res?.applied === false ? null : res);
      setCode('');
      toast.success(res?.message || 'Code applied.');
    } catch (err) {
      toast.error(err.message || 'Could not apply code.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await removeDiscountCode();
      setApplied(null);
      toast.success(res?.message || 'Code removed.');
    } catch (err) {
      toast.error(err.message || 'Could not remove code.');
    } finally {
      setBusy(false);
    }
  };

  const steps = [
    shell.text('store.bonusStep1', 'Enter your promo code in the field above'),
    shell.text('store.bonusStep2', 'Click "Apply Promo Code" to submit'),
    shell.text('store.bonusStep3', 'If valid, it is applied to your next purchase'),
    shell.text('store.bonusStep4', 'Offers may include discounts or special terms'),
  ];

  return (
    <div className="sm-bonus">
      <form className="sm-bonus__form" onSubmit={submit}>
        <label htmlFor="store-promo-code" className="sm-bonus__label">{shell.text('store.bonusTitle', 'Enter Promo Code')}</label>
        <p className="sm-bonus__sub">{shell.text('store.bonusSub', 'Unlock exclusive rewards and bonuses with your promo code.')}</p>
        {applied?.applied ? (
          <div className="sm-applied" role="status">
            <span>{applied.message || `Code ${applied.discountCode || ''} applied.`}</span>
            <button type="button" onClick={remove} disabled={busy}>Remove</button>
          </div>
        ) : null}
        <input id="store-promo-code" className="sm-promo-input" placeholder="Enter your promo code here..." autoComplete="off"
          value={code} onChange={(e) => setCode(e.target.value)} disabled={busy} />
        <button type="submit" className="sm-bonus__apply" disabled={busy || !code.trim()}>
          {busy ? 'Applying…' : 'Apply Promo Code'}
        </button>
      </form>
      <div className="sm-how">
        <p>How it works:</p>
        <ol className="sm-steps">{steps.map((s) => <li key={s}>{s}</li>)}</ol>
      </div>
    </div>
  );
}

/**
 * Store popup (Buy / Redeem / Bonus) for signed-in players.
 * Buy lists the admin-configured deposit packages and hands the chosen one to the existing /store checkout.
 * Redeem shows real balances and sends to the existing redeem flow. Bonus applies codes through the existing apply-code API.
 */
export function StoreModal() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const shell = useLobbyShell();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('buy');

  const hiddenTabs = useMemo(() => STORE_TABS.filter((t) => t !== 'buy' && shell.hidden('store', t)), [shell]);
  const tabs = STORE_TABS.filter((t) => !hiddenTabs.includes(t));

  const openTab = useCallback((next) => {
    setTab(STORE_TABS.includes(next) ? next : 'buy');
    setOpen(true);
  }, []);

  useEffect(() => {
    const onOpen = (e) => {
      consumePendingStoreOpen();
      openTab(e?.detail?.tab);
    };
    window.addEventListener(OPEN_STORE_EVENT, onOpen);
    // An open request made before this (lazy) component existed.
    const pending = consumePendingStoreOpen();
    if (pending) openTab(pending.tab);
    return () => window.removeEventListener(OPEN_STORE_EVENT, onOpen);
  }, [openTab]);

  useEffect(() => {
    setStoreModalOpen(open);
    return () => setStoreModalOpen(false);
  }, [open]);

  // ?modal=store (also ?modal=store&tab=redeem) opens the popup, then the param is removed.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('modal') !== 'store' || !isAuthenticated) return;
    openTab(params.get('tab'));
    params.delete('modal');
    params.delete('tab');
    const qs = params.toString();
    navigate({ pathname: location.pathname, search: qs ? `?${qs}` : '' }, { replace: true });
  }, [location.search, location.pathname, isAuthenticated, navigate, openTab]);

  useEffect(() => {
    if (!open) return undefined;
    const release = lockBodyScroll();
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      release?.();
    };
  }, [open]);

  if (!open || !isAuthenticated) return null;

  const close = () => setOpen(false);
  const pickPackage = (pkg) => {
    close();
    navigate(`/store?package=${encodeURIComponent(pkg.id)}`);
  };
  const activeTab = tabs.includes(tab) ? tab : 'buy';

  return createPortal(
    <div className="sm-overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="sm-modal" role="dialog" aria-modal="true" aria-labelledby="sm-title">
        <div className="sm-modal__bg" aria-hidden="true" />
        <div className="sm-head">
          <h2 id="sm-title">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5" />
              <path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244" />
              <path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05" />
            </svg>
            {shell.text('store.title', 'Store')}
          </h2>
          <button type="button" className="sm-close" aria-label="Close" onClick={close}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>
        <div className="sm-tabs-wrap">
          <div className="sm-tabs" role="tablist">
            {tabs.map((id) => (
              <button key={id} type="button" role="tab" aria-selected={activeTab === id} className={`sm-tab${activeTab === id ? ' is-on' : ''}`} onClick={() => setTab(id)}>
                {shell.label('store', id, TAB_LABELS[id][0])}
              </button>
            ))}
          </div>
        </div>
        <div className="sm-body">
          {activeTab === 'buy' && <BuyTab onPick={pickPackage} shell={shell} />}
          {activeTab === 'redeem' && <RedeemTab shell={shell} user={user} onNavigate={close} />}
          {activeTab === 'bonus' && <BonusTab shell={shell} />}
        </div>
      </div>
    </div>,
    document.body
  );
}
