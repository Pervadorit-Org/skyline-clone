/**
 * Make navigator.clipboard.writeText work everywhere the app copies text
 * (referral code/link, game credentials, coupons…).
 *
 * Native API is used first. If it is missing (plain http on a LAN IP, older WebViews) or rejects
 * (permissions policy, lost focus), fall back to a hidden <textarea> + execCommand('copy').
 */
function legacyCopy(text) {
  const el = document.createElement('textarea');
  el.value = String(text ?? '');
  el.setAttribute('readonly', '');
  el.style.position = 'fixed';
  el.style.top = '0';
  el.style.left = '0';
  el.style.opacity = '0';
  el.style.pointerEvents = 'none';
  // Modals often set user-select:none, which makes select()/copy fail on the helper textarea.
  el.style.userSelect = 'text';
  el.style.webkitUserSelect = 'text';
  const active = document.activeElement;
  // Inside a modal with a focus trap, a textarea appended to <body> cannot take focus and the copy
  // silently fails — attach it next to the focused element instead.
  const host =
    (active && active.closest && active.closest('[role="dialog"], dialog, [aria-modal="true"]')) || document.body;
  host.appendChild(el);
  el.focus({ preventScroll: true });
  el.select();
  el.setSelectionRange(0, el.value.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  host.removeChild(el);
  if (active && typeof active.focus === 'function') active.focus({ preventScroll: true });
  return ok;
}

export function installClipboardFallback() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const nav = window.navigator;
  const native = nav.clipboard && typeof nav.clipboard.writeText === 'function'
    ? nav.clipboard.writeText.bind(nav.clipboard)
    : null;

  const writeText = async (text) => {
    if (native) {
      try {
        await native(text);
        return;
      } catch {
        /* fall through to legacy copy */
      }
    }
    if (!legacyCopy(text)) throw new Error('Copy failed');
  };

  try {
    if (nav.clipboard) {
      nav.clipboard.writeText = writeText;
    } else {
      Object.defineProperty(nav, 'clipboard', { value: { writeText }, configurable: true });
    }
  } catch {
    /* read-only clipboard object: leave native behaviour */
  }
}
