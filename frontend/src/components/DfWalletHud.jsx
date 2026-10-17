import { storeLinkClick } from './Store/storeModalEvents';
import { Link } from 'react-router-dom';
import { warmupDeposit } from '../utils/preloadDeposit';
import { LockIcon } from '../assets/icons';

function formatWalletAmount(n) {
  return Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/** 150000 -> "150K", 1250000 -> "1.25M", 900 -> "900" (header pill, like the live site). */
function formatGcCompact(n) {
  const v = Math.floor(Number(n) || 0);
  if (v >= 1_000_000) return `${+(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${+(v / 1_000).toFixed(1)}K`;
  return String(v);
}

function formatGcAmount(n) {
  return Math.floor(Number(n) || 0).toLocaleString('en-US');
}

/**
 * Live DragonFury.online wallet HUD — balance bar + add button.
 * Renders in-header (desktop beside logo; mobile CSS pins it top-left).
 */
export function DfWalletHud({
  amount,
  balanceLoading,
  open,
  onToggle,
  onClose,
  psc,
  bsc,
  rsc,
  lockedSc = 0,
  onUnlockPhone,
  // Gold Coins (GC stores only): second wallet + GC/SC switch. Nothing is converted by switching.
  gcEnabled = false,
  mode = 'SC',
  gcAmount = 0,
  onSwitchMode,
  switching = false
}) {
  const gcMode = gcEnabled && mode === 'GC';
  const unit = gcMode ? 'GC' : 'SC';
  const display = gcMode ? formatGcAmount(gcAmount) : formatWalletAmount(amount);

  // Gold Coin stores: "GC 150K" pill with a G/S toggle inside it (live Golden Dragon header).
  if (gcEnabled) {
    const pillText = gcMode ? formatGcCompact(gcAmount) : Number(amount || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
    return (
      <div className="df-wallet-hud df-gcsc" data-mode={gcMode ? 'GC' : 'SC'} data-open={open ? 'true' : 'false'} data-tour="balances">
        <img className="df-wallet-hud__tier" src="/df-online/dragons/tier-elder-dragon.webp" alt="" width={34} height={34} aria-hidden />
        <div className="df-gcsc__pill">
          <button
            type="button"
            className="df-gcsc__amount onboarding-navbar-wallet"
            aria-expanded={open}
            aria-label={`${gcMode ? 'Gold Coins' : 'Sweeps Coins'} balance ${gcMode ? display : formatWalletAmount(amount)}. Show wallets`}
            onClick={onToggle}
            disabled={balanceLoading}
          >
            <span className="df-gcsc__unit">{unit}</span>
            <span className="df-gcsc__value">{balanceLoading ? '…' : pillText}</span>
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={!gcMode}
            aria-label={gcMode ? 'Playing with Gold Coins. Switch to Sweeps Coins' : 'Playing with Sweeps Coins. Switch to Gold Coins'}
            className="df-gcsc__switch"
            disabled={switching || balanceLoading}
            onClick={() => onSwitchMode?.(gcMode ? 'SC' : 'GC')}
          >
            <span className="df-gcsc__knob">{gcMode ? 'G' : 'S'}</span>
          </button>

          {open ? (
            <div className="df-wallet-hud__sheet" role="dialog" aria-label="Balance details">
              <button type="button" className="df-wallet-hud__dismiss" aria-label="Close" onClick={onClose}>
                <img src="/df-online/wallet-close.webp" alt="" width={44} height={44} />
              </button>
              <div className="df-wallet-hud__row">
                <span className="df-wallet-hud__row-label">Gold Coins (GC)</span>
                <strong className="df-wallet-hud__row-value">{formatGcAmount(gcAmount)}</strong>
              </div>
              <div className="df-wallet-hud__row">
                <span className="df-wallet-hud__row-label">Purchased SC</span>
                <strong className="df-wallet-hud__row-value">{formatWalletAmount(psc)}</strong>
              </div>
              <div className="df-wallet-hud__row">
                <span className="df-wallet-hud__row-label">Bonus SC</span>
                <strong className="df-wallet-hud__row-value">{formatWalletAmount(bsc)}</strong>
              </div>
              <div className="df-wallet-hud__row">
                <span className="df-wallet-hud__row-label">Redeemable SC</span>
                <strong className="df-wallet-hud__row-value">{formatWalletAmount(rsc)}</strong>
              </div>
              {lockedSc > 0 ? (
                <div className="df-wallet-hud__row df-wallet-hud__row--locked">
                  <span className="df-wallet-hud__row-label"><LockIcon className="df-wallet-hud__lock" /> Locked</span>
                  <strong className="df-wallet-hud__row-value">{formatWalletAmount(lockedSc)}</strong>
                </div>
              ) : null}
              {lockedSc > 0 && onUnlockPhone ? (
                <button type="button" className="df-wallet-hud__unlock" onClick={onUnlockPhone}>
                  Verify phone to unlock
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <Link to="/store" className="df-gcsc__store onboarding-deposit-btn" aria-label="Open the store" onClick={storeLinkClick('buy')} onPointerEnter={() => warmupDeposit()}>
          STORE
        </Link>
      </div>
    );
  }

  return (
    <div className="df-wallet-hud" data-open={open ? 'true' : 'false'} data-tour="balances">
      <img className="df-wallet-hud__tier" src="/df-online/dragons/tier-elder-dragon.webp" alt="" width={34} height={34} aria-hidden />
      <div className="df-wallet-hud__bar">
        <img
          className="df-wallet-hud__holder"
          src="/df-online/balance-background.webp"
          alt=""
          width={760}
          height={194}
          decoding="async"
          aria-hidden
        />
        <button
          type="button"
          className="df-wallet-hud__amount onboarding-navbar-wallet"
          aria-expanded={open}
          aria-label={gcMode ? `Balance ${display} GC. Show wallets` : `Balance ${display} SC. Show available and redeemable`}
          onClick={onToggle}
          disabled={balanceLoading}
        >
          <small>{unit}</small>
          <span>{balanceLoading ? '…' : display}</span>
        </button>

        {open ? (
          <div className="df-wallet-hud__sheet" role="dialog" aria-label="Balance details">
            <button
              type="button"
              className="df-wallet-hud__dismiss"
              aria-label="Close"
              onClick={onClose}
            >
              <img src="/df-online/wallet-close.webp" alt="" width={44} height={44} />
            </button>
            {gcEnabled ? (
              <div className="df-wallet-hud__row">
                <span className="df-wallet-hud__row-label">Gold Coins (GC)</span>
                <strong className="df-wallet-hud__row-value">{formatGcAmount(gcAmount)}</strong>
              </div>
            ) : null}
            <div className="df-wallet-hud__row">
              <span className="df-wallet-hud__row-label">Purchased</span>
              <strong className="df-wallet-hud__row-value">{formatWalletAmount(psc)}</strong>
            </div>
            <div className="df-wallet-hud__row">
              <span className="df-wallet-hud__row-label">Bonus</span>
              <strong className="df-wallet-hud__row-value">{formatWalletAmount(bsc)}</strong>
            </div>
            <div className="df-wallet-hud__row">
              <span className="df-wallet-hud__row-label">Redeemable</span>
              <strong className="df-wallet-hud__row-value">{formatWalletAmount(rsc)}</strong>
            </div>
            {lockedSc > 0 ? (
              <div className="df-wallet-hud__row df-wallet-hud__row--locked">
                <span className="df-wallet-hud__row-label">
                  <LockIcon className="df-wallet-hud__lock" /> Locked
                </span>
                <strong className="df-wallet-hud__row-value">{formatWalletAmount(lockedSc)}</strong>
              </div>
            ) : null}
            {lockedSc > 0 && onUnlockPhone ? (
              <button type="button" className="df-wallet-hud__unlock" onClick={onUnlockPhone}>
                Verify phone to unlock
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <Link
        to="/store"
        className="df-wallet-hud__add onboarding-deposit-btn"
        aria-label="Add money — open the store"
        onClick={storeLinkClick('buy')}
        onPointerEnter={() => warmupDeposit()}
      >
        <span className="df-wallet-hud__add-label">Store</span>
      </Link>
    </div>
  );
}
