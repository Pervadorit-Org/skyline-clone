import { openSupportWidget } from '../intercomApi';

/**
 * Floating support launcher — opens themed Help Desk / chat modal (matches live).
 * Rendered as a round headset button in the bottom-right dock.
 */
export function DragonFuryHelpLauncher() {
  return (
    <button
      type="button"
      className="df-help-launcher"
      aria-label="Help"
      title="Support"
      aria-haspopup="dialog"
      onClick={openSupportWidget}
    >
      <svg
        className="df-help-launcher__icon"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
        <rect x="2.5" y="13" width="4" height="6" rx="1.6" fill="currentColor" />
        <rect x="17.5" y="13" width="4" height="6" rx="1.6" fill="currentColor" />
        <path d="M19.5 19c0 1.7-1.6 2.6-4 2.6H13" />
      </svg>
    </button>
  );
}
