import { createPortal } from 'react-dom';
import { useEffect, useMemo, useState } from 'react';
import { CheckIcon, RefreshIcon } from '../../assets/icons';
import { formatSc } from '../../utils/currency';
import { lockBodyScroll } from '../../utils/bodyScrollLock';
import './DailyBonusTrackerModal.css';
import './DailyRewardsModal.css';

const TOTAL_DAYS = 7;
const SPIN_ICON = '/spinwheel-free-spin.svg';
const VOUCHER_ICON = '/spinwheel-coupon.svg';

/** 0.5 -> "0.5", 1 -> "1", 2.25 -> "2.25" (no trailing zeros, like the reference design). */
function formatScShort(value) {
  return String(+(Number(value) || 0).toFixed(2));
}

/** 20000 -> "20K", 1500000 -> "1.5M", 750 -> "750". */
export function formatGc(value) {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function rewardSummary(day) {
  if (day.rewardType === 'sc_coins') return `${formatSc(day.amountSc)} SC`;
  if (day.rewardType === 'bonus_spin') {
    return day.spinCount > 1 ? `${day.spinCount} Free Spins` : '1 Free Spin';
  }
  if (day.rewardType === 'discount_voucher') return `${day.percentOff}% Off`;
  return day.label || `Day ${day.dayIndex}`;
}

export function stateLabel(state) {
  switch (state) {
    case 'claimable':
    case 'available':
      return 'Claim';
    case 'claimed':
      return 'Claimed';
    case 'waiting_tomorrow':
      return 'Tomorrow';
    default:
      return 'Locked';
  }
}

function isClaimableState(state) {
  return state === 'claimable' || state === 'available';
}

/** The reward lines a day card shows (GC first, then the day's own reward). */
function CoinIcon({ kind }) {
  return (
    <img
      className="dr-coin"
      src={kind === 'gc' ? '/ref/images/gold-coin.webp' : '/ref/images/sweep-coin.webp'}
      alt=""
      aria-hidden="true"
      width="24"
      height="24"
      draggable="false"
    />
  );
}

function rewardLines(day) {
  const lines = [];
  if (Number(day.gcAmount) > 0) {
    lines.push({ key: 'gc', coin: 'gc', text: formatGc(day.gcAmount) });
  }
  if (day.rewardType === 'sc_coins') {
    if (Number(day.amountSc) > 0) {
      lines.push({ key: 'sc', coin: 'sc', text: formatScShort(day.amountSc) });
    }
  } else if (day.rewardType === 'bonus_spin') {
    const spins = Math.max(1, Number(day.spinCount) || 1);
    lines.push({ key: 'spin', icon: SPIN_ICON, text: `${spins} ${spins > 1 ? 'Spins' : 'Spin'}` });
  } else if (day.rewardType === 'discount_voucher') {
    lines.push({ key: 'voucher', icon: VOUCHER_ICON, text: `${day.percentOff}% Off` });
  }
  return lines;
}

function CircleCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function DayCard({ day, isToday }) {
  const claimed = day.state === 'claimed';
  const locked = !claimed && !isToday;
  const lines = rewardLines(day);

  let stateText = null;
  if (claimed) stateText = 'Claimed';
  else if (day.state === 'waiting_tomorrow') stateText = 'Tomorrow';
  else if (locked) stateText = 'Not available';

  return (
    <div
      className={`dr-card${isToday ? ' dr-card--today' : ''}${locked ? ' dr-card--locked' : ''}${claimed ? ' dr-card--done' : ''}`}
    >
      {isToday ? <div className="dr-badge">Today</div> : null}
      <div className="dr-card__day">Day {day.dayIndex}</div>
      {lines.map((line) => (
        <div key={line.key} className="dr-card__row">
          {line.coin ? (
            <CoinIcon kind={line.coin} />
          ) : (
            <img src={line.icon} alt="" aria-hidden="true" width={20} height={20} loading="lazy" decoding="async" draggable={false} />
          )}
          <span>{line.text}</span>
        </div>
      ))}
      {stateText ? (
        <div className="dr-card__state">
          {claimed ? <CheckIcon width={14} height={14} aria-hidden /> : <CircleCheck />}
          <span>{stateText}</span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Daily Rewards popup — opens after login (see useDashboardPromoModals) or from the sidebar.
 * Rewards per day come from Admin → Daily Bonus (GC shown, SC / spins / voucher credited on claim).
 */
export function DailyBonusTrackerModal({
  open,
  onClose,
  status,
  loading,
  claimingDay,
  onClaim,
}) {
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setInfoOpen(false);
    const releaseScrollLock = lockBodyScroll();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      releaseScrollLock();
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const days = status?.days || [];
  const available = status?.available === true;
  const permanentlyDone = !!status?.permanently_done;
  const repeats = !!status?.repeat_after_complete;
  const resetsOnMiss = status?.reset_on_miss === true;
  const claimedToday = !!status?.claimed_today;
  const totalDays = days.length || TOTAL_DAYS;

  const claimableDay = useMemo(
    () => days.find((d) => isClaimableState(d.state)) || null,
    [days]
  );
  const canClaim = !!claimableDay && !claimedToday && !permanentlyDone;
  const claiming = claimingDay != null;
  const claimedCount = days.filter((d) => d.state === 'claimed').length;
  const percent = Math.min(100, Math.round((claimedCount / totalDays) * 100));

  let claimLabel = 'Claimed!';
  if (canClaim) {
    claimLabel = claimingDay === claimableDay.dayIndex ? 'Claiming…' : `Claim Day ${claimableDay.dayIndex}`;
  } else if (permanentlyDone) {
    claimLabel = repeats ? 'Back tomorrow' : 'Complete!';
  }

  if (!open) return null;

  return createPortal(
    <div
      className="dr-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-bonus-title"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="dr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dr-top">
          <button
            type="button"
            className="dr-icon-btn"
            aria-label="How daily rewards work"
            aria-expanded={infoOpen}
            onClick={() => setInfoOpen((v) => !v)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </button>
          <button type="button" className="dr-icon-btn" aria-label="Close" onClick={onClose}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {infoOpen ? (
          <div className="dr-info" role="note">
            <strong>How daily rewards work</strong>
            <ul>
              <li>Log in and claim once every day.</li>
              <li>Each day unlocks a bigger reward, Day {totalDays} is the biggest.</li>
              <li>
                {resetsOnMiss
                  ? 'Miss a day and the streak starts again from Day 1.'
                  : 'Claim the days in order, one per day.'}
              </li>
            </ul>
          </div>
        ) : null}

        <div className="dr-body">
          <div className="dr-head">
            <h2 id="daily-bonus-title" className="dr-title">Daily Rewards</h2>
            <p className="dr-sub">Log in every day for guaranteed rewards</p>
          </div>

          {loading ? (
            <div className="dr-loading">
              <RefreshIcon width={36} height={36} className="dr-spin" />
            </div>
          ) : !available ? (
            <p className="dr-empty">
              {permanentlyDone
                ? "You've completed all days of your daily bonus!"
                : 'Daily rewards are not available right now.'}
            </p>
          ) : (
            <>
              <div className="dr-spacer" />
              <div className="dr-days-wrap">
                <div className="dr-days">
                  {days.slice(0, totalDays).map((day) => (
                    <DayCard
                      key={day.dayIndex}
                      day={day}
                      isToday={canClaim && day.dayIndex === claimableDay.dayIndex}
                    />
                  ))}
                </div>
              </div>

              <div className="dr-foot">
                <div className="dr-progress">
                  <div className="dr-progress__head">
                    <span>Progress:</span>
                    <strong>{claimedCount} / {totalDays} days in a row</strong>
                  </div>
                  <div
                    className="dr-progress__track"
                    role="progressbar"
                    aria-label="Daily rewards progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                  >
                    <div className="dr-progress__bar" style={{ width: `${percent}%` }} />
                  </div>
                  <p className="dr-progress__note">
                    {resetsOnMiss
                      ? 'Missing a day means starting your journey all over again.'
                      : 'Come back every day to collect the next reward.'}
                  </p>
                </div>

                <button
                  type="button"
                  className="dr-claim"
                  disabled={!canClaim || claiming}
                  onClick={() => canClaim && onClaim?.(claimableDay.dayIndex)}
                >
                  {claimLabel}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Kept for any imports that still expect the day-card export. */
export function DailyBonusDayCard() {
  return null;
}
