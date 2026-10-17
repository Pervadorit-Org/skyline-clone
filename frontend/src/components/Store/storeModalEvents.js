export const OPEN_STORE_EVENT = 'df:open-store';

export const STORE_TABS = ['buy', 'redeem', 'bonus'];

let pendingOpen = null;
let storeOpen = false;

/** Open the Store popup (Buy / Redeem / Bonus). Works from any component, even before the popup has mounted. */
export function openStoreModal(tab = 'buy') {
  pendingOpen = { tab };
  try {
    window.dispatchEvent(new CustomEvent(OPEN_STORE_EVENT, { detail: { tab } }));
  } catch (_) {
    /* non-browser */
  }
}

/** The popup calls this on mount (and when it gets the event) to pick up an open request made before it existed. */
export function consumePendingStoreOpen() {
  const next = pendingOpen;
  pendingOpen = null;
  return next;
}

/** Whether the popup is on screen (the login promo sequence waits for it to close). */
export function isStoreModalOpen() {
  return storeOpen;
}

export function setStoreModalOpen(value) {
  storeOpen = Boolean(value);
}

/** Link onClick: open the popup on a plain click, keep normal navigation for new-tab / modified clicks. */
export function storeLinkClick(tab = 'buy', after) {
  return (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    openStoreModal(tab);
    if (typeof after === 'function') after();
  };
}
