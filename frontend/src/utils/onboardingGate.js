import { STORE_CODE } from '../config/site';

/**
 * The onboarding tutorial is switched off (components/LayoutAuthOverlays.jsx), so nothing in the UI can set
 * users.onboarding_completed = true. Stores listed here must not hold the sign-in promo chain (and the automatic
 * daily-bonus pop-up) back for that flag, otherwise a new player never sees the pop-up.
 */
const STORES_WITHOUT_ONBOARDING_GATE = new Set(['goldendragon']);

/** True while a signed-in user's promo pop-ups should wait for onboarding. */
export function onboardingBlocksPromos(user) {
  if (user?.onboardingCompleted !== false) return false;
  return !STORES_WITHOUT_ONBOARDING_GATE.has(String(STORE_CODE || '').trim().toLowerCase());
}
