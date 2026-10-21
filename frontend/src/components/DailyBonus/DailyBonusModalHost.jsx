import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSpinWheelStatus } from '../../context/SpinWheelStatusContext';
import { DailyBonusTrackerModal } from './DailyBonusTrackerModal';
import * as dailyBonusApi from '../../api/dailyBonus';

/**
 * Hosts the Daily Bonus tracker + claim-result modals (promo auto-open and manual open).
 * After a successful claim the success message is shown inside the same Daily Rewards popup (no second modal).
 */
export function DailyBonusModalHost({
  open,
  onClose,
  status,
  loading,
  claimingDay,
  setClaimingDay,
  refreshSilent,
}) {
  const { refreshBalance } = useAuth();
  const { toast } = useToast();
  const { refreshSpinStatus } = useSpinWheelStatus();
  const [claimResult, setClaimResult] = useState(null);

  // If the feature is off / not configured, never leave the empty modal on screen.
  useEffect(() => {
    if (!open || loading) return;
    if (!status || status.available !== true) {
      onClose?.();
    }
  }, [open, loading, status, onClose]);

  // Forget the last claim once the popup closes.
  useEffect(() => {
    if (!open) setClaimResult(null);
  }, [open]);

  async function handleClaim(dayIndex) {
    setClaimingDay(dayIndex);
    try {
      const res = await dailyBonusApi.claimDailyBonus(dayIndex);
      setClaimResult({
        dayIndex,
        reward: res?.reward || null,
        balanceSc: res?.balance_sc ?? null,
      });
      await Promise.all([
        refreshBalance?.(),
        refreshSpinStatus?.(),
        refreshSilent?.(),
      ]);
    } catch (err) {
      toast.error(err.message || 'Claim failed.');
    } finally {
      setClaimingDay(null);
    }
  }

  return (
    <>
      <DailyBonusTrackerModal
        open={open}
        onClose={onClose}
        status={status}
        loading={loading}
        claimingDay={claimingDay}
        onClaim={handleClaim}
        claimResult={claimResult}
      />
    </>
  );
}
