import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePageReady } from '../context/PageReadyContext';
import { site } from '../config/site';
import {
  OPEN_INTERCOM_EVENT,
  OPEN_SUPPORT_WIDGET_EVENT,
  SHOW_INTERCOM_LAUNCHER_EVENT,
  consumePendingChatOpen,
  consumePendingSupportOpen,
} from './intercomApi';
import { beginAnimatedClose } from '../utils/dfCloseAnimation';
import './intercom-widget.css';

/** Lazy Intercom SDK — keeps the messenger out of the initial landing bundle. */
let intercomSdkPromise = null;
function loadIntercomSdk() {
  if (!intercomSdkPromise) {
    intercomSdkPromise = import('@intercom/messenger-js-sdk');
  }
  return intercomSdkPromise;
}

const INTERCOM_APP_ID = import.meta.env?.VITE_INTERCOM_APP_ID?.trim();
/**
 * Send logged-in user_id/email/name to Intercom (same as Orionstars — no backend hash/JWT).
 * Set VITE_INTERCOM_IDENTIFY_USERS=false to disable.
 * Requires Intercom Messenger Security / Identity Verification to be OFF for this workspace.
 */
const INTERCOM_IDENTIFY_USERS =
  import.meta.env?.VITE_INTERCOM_IDENTIFY_USERS?.trim()?.toLowerCase() !== 'false';
/** Support / Help Desk can open across the site (blocked on auth / in-game play). */
const SUPPORT_PANEL_BLOCKED = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/google-auth',
  '/auth',
];

function isSupportPanelAllowedRoute(pathname) {
  const path = String(pathname || '');
  if (!path) return false;
  if (SUPPORT_PANEL_BLOCKED.some((p) => path === p || path.startsWith(`${p}/`))) return false;
  if (path.includes('/play')) return false;
  return true;
}

/** Where Intercom messenger is allowed to boot. */
function isIntercomAllowedRoute(pathname) {
  return isSupportPanelAllowedRoute(pathname);
}

function isOnboardingTutorialActive() {
  try {
    return localStorage.getItem('onboarding_pending') === 'true';
  } catch {
    return false;
  }
}

/** Floating bubble visibility (can be hidden on deposit/withdraw without blocking sidebar Support). */
function canShowFloatingLauncher() {
  if (window.location.pathname !== '/') return false;
  const path = window.location.pathname;
  if (path === '/deposit' || path === '/withdraw' || path === '/redeem' || path.startsWith('/deposit/')) return false;
  if (path.startsWith('/support/tickets')) return false;
  if (document.body.classList.contains('onboarding-tutorial-active')) return false;
  if (isOnboardingTutorialActive()) return false;
  if (document.body.classList.contains('welcome-modal-open')) return false;
  if (document.body.classList.contains('guest-spin-modal-open')) return false;
  if (document.body.classList.contains('game-transfer-modal-open')) return false;
  if (document.body.classList.contains('page-loader-active')) return false;
  if (document.body.classList.contains('app-modal-open')) return false;
  if (document.body.hasAttribute('data-scroll-locked')) return false;
  return true;
}

function canOpenSupportPanel() {
  if (!isSupportPanelAllowedRoute(window.location.pathname)) return false;
  if (document.body.classList.contains('onboarding-tutorial-active')) return false;
  if (isOnboardingTutorialActive()) return false;
  return true;
}

function setIntercomOpenState(open) {
  document.body.classList.toggle('intercom-maximized', open);
}

/** True only after a successful Intercom boot in this session. */
let intercomMessengerBooted = false;

function isIntercomMessengerReady() {
  return (
    intercomMessengerBooted &&
    typeof window !== 'undefined' &&
    typeof window.Intercom === 'function'
  );
}

function hideIntercomMessenger() {
  if (!isIntercomMessengerReady()) {
    setIntercomOpenState(false);
    return;
  }
  loadIntercomSdk()
    .then((sdk) => {
      try {
        sdk.hide();
      } catch {
        /* messenger may not be booted */
      }
    })
    .catch(() => {});
  setIntercomOpenState(false);
}

function shutdownIntercom() {
  if (!isIntercomMessengerReady()) {
    intercomMessengerBooted = false;
    setIntercomOpenState(false);
    return;
  }
  loadIntercomSdk()
    .then((sdk) => {
      try {
        sdk.shutdown();
      } catch {
        /* already shut down */
      }
    })
    .catch(() => {});
  intercomMessengerBooted = false;
  setIntercomOpenState(false);
}

/** Same approach as Orionstars LiveChatProvider — identify from frontend user only. */
function buildIntercomSettings(user) {
  const settings = {
    app_id: INTERCOM_APP_ID,
    hide_default_launcher: true,
  };

  if (!INTERCOM_IDENTIFY_USERS || !user) return settings;

  const name = user.username || user.name || [user.firstName, user.lastName].filter(Boolean).join(' ');
  const email = user.email;
  const userId = user.userId ?? user.id;
  const createdRaw = user.createdAt ?? user.created_at;

  if (name) settings.name = String(name);
  if (email) settings.email = String(email);
  if (userId != null && userId !== '') settings.user_id = String(userId);

  if (createdRaw) {
    const ms = new Date(createdRaw).getTime();
    if (!Number.isNaN(ms)) settings.created_at = Math.floor(ms / 1000);
  }

  return settings;
}

/* ── Support messenger (Home / Messages / Help) ── */

function SendIcon() {
  return (
    <svg viewBox="0 0 17 16" width="17" height="16" aria-hidden>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="m4.563 14.605 9.356-5.402c1-.577 1-2.02 0-2.598L4.563 1.203a1.5 1.5 0 0 0-2.25 1.3v10.803a1.5 1.5 0 0 0 2.25 1.3M6.51 8.387 2.313 9.512V6.297L6.51 7.42c.494.133.494.834 0 .966"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden>
      <circle cx="7.5" cy="7.5" r="4.625" stroke="currentColor" strokeWidth="1.75" />
      <path d="m10.4 11.6 4.2 4.2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" transform="translate(-1.2 -1.4)" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden>
      <path d="m6 3.6 4.4 4.4L6 12.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M3 3.7h4V2H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2h-1.7v2a.3.3 0 0 1-.3.3H3a.3.3 0 0 1-.3-.3V4a.3.3 0 0 1 .3-.3M9.218 3c0 .47.38.85.85.85h1.88L8.296 7.502a.85.85 0 0 0 1.202 1.202l3.652-3.652v1.88a.85.85 0 0 0 1.7 0V3a.85.85 0 0 0-.85-.85h-3.932a.85.85 0 0 0-.85.85"
        clipRule="evenodd"
      />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M.974 4.303C.465 4.52 0 4.948 0 5.5v5c0 .552.465.981.974 1.197a2.5 2.5 0 0 1 1.33 1.33c.215.508.644.973 1.196.973h9c.552 0 .981-.465 1.197-.974a2.5 2.5 0 0 1 1.33-1.33c.508-.215.973-.644.973-1.196v-5c0-.552-.465-.981-.974-1.197a2.5 2.5 0 0 1-1.33-1.33C13.482 2.466 13.053 2 12.5 2h-9c-.552 0-.981.465-1.197.974a2.5 2.5 0 0 1-1.33 1.33M3 6.25a.75.75 0 0 1 .75-.75h8a.75.75 0 0 1 0 1.5h-8A.75.75 0 0 1 3 6.25m1.5 3.5A.75.75 0 0 1 5.25 9h5a.75.75 0 0 1 0 1.5h-5A.75.75 0 0 1 4.5 9.75"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden>
      <path d="M11.89 11.889 4.11 4.11M4.11 11.889 11.89 4.11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function TabHomeIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill={active ? 'currentColor' : 'none'} aria-hidden>
      <path
        d="M10.5 2.9 3.4 7.8A2.2 2.2 0 0 0 2.5 9.4v10.2c0 .9.9 1.7 2 1.7h15c1.1 0 2-.8 2-1.7V9.4c0-.6-.3-1.2-.9-1.6l-7.1-4.9a2.1 2.1 0 0 0-2.5 0Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M7.1 14.9A6.2 6.2 0 0 0 12 17c1.9 0 3.6-.8 4.9-2.1"
        stroke={active ? '#fff' : 'currentColor'}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TabMessagesIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden>
      <path
        d="M19 2.7H5A2.3 2.3 0 0 0 2.7 5v10A2.3 2.3 0 0 0 5 17.3h10.56l3.88 3.87c.55.55 1.26.2 1.26-.37V5A2.3 2.3 0 0 0 19 2.7Z"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M7 7.85h10M7 11.85h5"
        stroke={active ? '#fff' : 'currentColor'}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TabHelpIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="9.65"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M9.66 8.58a2.41 2.41 0 1 1 4.1 2.39l-1.07 1.1c-.33.32-.77.76-.77 1.54v.36"
        stroke={active ? '#fff' : 'currentColor'}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="11.93" cy="16.88" r="0.88" fill={active ? '#fff' : 'currentColor'} />
    </svg>
  );
}

function SupportWidget({ isOpen, onClose, onOpenChat, isAuthenticated = false }) {
  const [exiting, setExiting] = useState(false);
  const [tab, setTab] = useState('home');
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);

  const topics = useMemo(() => {
    const all = [
      { label: 'Create Account', desc: 'Sign up and get started.', to: '/help?tab=create-account' },
      { label: 'Recharge', desc: 'Buying coins and payment help.', to: '/help?tab=recharge' },
      { label: 'Redeem', desc: 'Redeeming and withdrawals.', to: '/help?tab=redeem' },
      { label: 'Promotions', desc: 'Bonuses, offers and rewards.', to: '/help?tab=promotions' },
      { label: 'Link2Play', desc: 'Play without an account.', to: '/link2play', guestOnly: true },
    ];
    return isAuthenticated ? all.filter((topic) => !topic.guestOnly) : all;
  }, [isAuthenticated]);

  const socials = useMemo(
    () =>
      [
        { label: 'Join Our Instagram', href: site.socialLinks?.instagram },
        { label: 'Join Our Facebook', href: site.socialLinks?.facebook },
        { label: 'Join Our Telegram', href: site.socialLinks?.telegram },
        { label: 'Join Our Discord', href: site.socialLinks?.discord },
      ].filter((s) => s.href),
    []
  );

  const filteredTopics = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter((t) => `${t.label} ${t.desc}`.toLowerCase().includes(q));
  }, [topics, query]);

  const requestClose = useCallback(() => {
    beginAnimatedClose(exiting, setExiting, onClose);
  }, [exiting, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setExiting(false);
      document.body.classList.remove('df-help-desk-open');
      return undefined;
    }
    setTab('home');
    setQuery('');
    document.body.classList.add('df-help-desk-open');
    return () => document.body.classList.remove('df-help-desk-open');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, requestClose]);

  if (!isOpen) return null;

  const goToHelpSearch = () => {
    setTab('help');
    window.setTimeout(() => searchRef.current?.focus(), 0);
  };

  const closeBtn = (extra = '') => (
    <button
      type="button"
      className={`df-msgr__close${extra}`}
      onClick={requestClose}
      aria-label="Close"
    >
      <CloseIcon />
    </button>
  );

  const tabs = [
    { id: 'home', label: 'Home', Icon: TabHomeIcon },
    { id: 'messages', label: 'Messages', Icon: TabMessagesIcon },
    { id: 'help', label: 'Help', Icon: TabHelpIcon },
  ];

  return (
    <div
      className={`df-help-desk${exiting ? ' is-exiting' : ''}`}
      role="dialog"
      aria-label={`${site.platformName} support`}
    >
      <section className="df-msgr">
        <div className="df-msgr__body" role="tabpanel" id={`df-msgr-${tab}`}>
          {tab === 'home' ? (
            <div className="df-msgr__home">
              <div className="df-msgr__hero">
                {closeBtn(' df-msgr__close--hero')}
                <img className="df-msgr__logo" src={site.logoUrl} alt={`${site.platformName} logo`} />
                <h1 className="df-msgr__hi">Hi there <span aria-hidden>👋</span></h1>
                <h1 className="df-msgr__how">How can we help?</h1>
              </div>

              <div className="df-msgr__cards">
                <button type="button" className="df-msgr__card df-msgr__row" onClick={onOpenChat}>
                  <span className="df-msgr__row-text">
                    <strong>Send us a message</strong>
                    <small>We typically reply in under a minute</small>
                  </span>
                  <span className="df-msgr__row-ico df-msgr__row-ico--accent"><SendIcon /></span>
                </button>

                <div className="df-msgr__card">
                  <button type="button" className="df-msgr__search-pill" onClick={goToHelpSearch}>
                    <span>Search for help</span>
                    <SearchIcon />
                  </button>
                  <ul className="df-msgr__list">
                    {topics.slice(0, 3).map((t) => (
                      <li key={t.label}>
                        <Link to={t.to} onClick={requestClose} className="df-msgr__row df-msgr__row--plain">
                          <span className="df-msgr__row-text">{t.label}</span>
                          <span className="df-msgr__row-ico"><ChevronIcon /></span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="df-msgr__card">
                  <h2 className="df-msgr__card-title">Create a ticket</h2>
                  <Link to="/support/tickets" onClick={requestClose} className="df-msgr__row df-msgr__row--plain">
                    <span className="df-msgr__row-text">Tickets</span>
                    <span className="df-msgr__row-ico"><TicketIcon /></span>
                  </Link>
                </div>

                {socials.length > 0 ? (
                  <div className="df-msgr__card">
                    <ul className="df-msgr__list">
                      {socials.map((s) => (
                        <li key={s.label}>
                          <a
                            href={s.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="df-msgr__row df-msgr__row--plain"
                            aria-label={`${s.label} (opens in new tab)`}
                          >
                            <span className="df-msgr__row-text">{s.label}</span>
                            <span className="df-msgr__row-ico"><ExternalIcon /></span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {tab === 'messages' ? (
            <div className="df-msgr__page">
              <header className="df-msgr__page-head">
                <h2>Messages</h2>
                {closeBtn()}
              </header>
              <div className="df-msgr__empty">
                <TabMessagesIcon active />
                <h3>No messages</h3>
                <p>Messages from the team will be shown here</p>
              </div>
              <div className="df-msgr__cta-wrap">
                <button type="button" className="df-msgr__cta" onClick={onOpenChat}>
                  <span>Send us a message</span>
                  <SendIcon />
                </button>
              </div>
            </div>
          ) : null}

          {tab === 'help' ? (
            <div className="df-msgr__page">
              <header className="df-msgr__page-head df-msgr__page-head--search">
                <h2>Help</h2>
                {closeBtn()}
                <label className="df-msgr__search">
                  <input
                    ref={searchRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for help"
                    aria-label="Search for help"
                  />
                  <SearchIcon />
                </label>
              </header>
              <div className="df-msgr__collections">
                <h3>
                  {filteredTopics.length} {filteredTopics.length === 1 ? 'collection' : 'collections'}
                </h3>
                {filteredTopics.length === 0 ? (
                  <p className="df-msgr__none">No results for “{query.trim()}”.</p>
                ) : (
                  <ul>
                    {filteredTopics.map((t) => (
                      <li key={t.label}>
                        <Link to={t.to} onClick={requestClose} className="df-msgr__collection">
                          <span>
                            <strong>{t.label}</strong>
                            <small>{t.desc}</small>
                          </span>
                          <ChevronIcon />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="df-msgr__tabs" role="tablist" aria-label="Support sections">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls={`df-msgr-${id}`}
              className={`df-msgr__tab${tab === id ? ' is-active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon active={tab === id} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export function IntercomWidget() {
  const location = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { showLoader } = usePageReady();
  const bootedRef = useRef(false);
  const identityKeyRef = useRef('');
  const [mounted, setMounted] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [messengerOpen, setMessengerOpen] = useState(false);

  const allowedRoute = isIntercomAllowedRoute(location.pathname);
  const supportPanelAllowed = isSupportPanelAllowedRoute(location.pathname);
  const canUseIntercom = Boolean(INTERCOM_APP_ID) && allowedRoute && !authLoading;
  const identityKey = INTERCOM_IDENTIFY_USERS
    ? `${isAuthenticated ? 'user' : 'guest'}:${user?.userId ?? user?.id ?? ''}:${user?.email ?? ''}`
    : 'visitor';

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (messengerOpen) {
      document.body.classList.add('intercom-maximized');
    } else {
      document.body.classList.remove('intercom-maximized');
    }
    return () => document.body.classList.remove('intercom-maximized');
  }, [messengerOpen]);

  useEffect(() => {
    document.body.classList.toggle('support-widget-open', supportOpen);
    return () => document.body.classList.remove('support-widget-open');
  }, [supportOpen]);

  useEffect(() => {
    if (!allowedRoute || showLoader) {
      hideIntercomMessenger();
    }
    if (!supportPanelAllowed) {
      setSupportOpen(false);
    }
  }, [allowedRoute, supportPanelAllowed, showLoader]);

  useEffect(() => {
    if (!canUseIntercom) {
      if (bootedRef.current) {
        shutdownIntercom();
        bootedRef.current = false;
        identityKeyRef.current = '';
      }
    }
  }, [canUseIntercom]);

  useEffect(() => () => {
    shutdownIntercom();
    bootedRef.current = false;
    identityKeyRef.current = '';
  }, []);

  useEffect(() => {
    if (!bootedRef.current || !canUseIntercom) return;
    loadIntercomSdk()
      .then((sdk) => {
        try {
          sdk.update({});
        } catch {
          /* messenger may not be ready */
        }
      })
      .catch(() => {});
  }, [location.pathname, canUseIntercom]);

  const openSupportPanel = useCallback(() => {
    if (!canOpenSupportPanel()) return;
    setSupportOpen(true);
  }, []);

  const openChat = useCallback(() => {
    if (isOnboardingTutorialActive() || document.body.classList.contains('onboarding-tutorial-active')) {
      return;
    }
    if (!canUseIntercom) {
      openSupportPanel();
      return;
    }
    setSupportOpen(false);
    setMessengerOpen(true);
    loadIntercomSdk()
      .then((sdk) => {
        try {
          // Ensure messenger is booted before show (idle boot may not have run yet).
          if (!bootedRef.current || identityKeyRef.current !== identityKey) {
            sdk.default(buildIntercomSettings(INTERCOM_IDENTIFY_USERS ? user : null));
            intercomMessengerBooted = true;
            bootedRef.current = true;
            identityKeyRef.current = identityKey;
            sdk.onShow(() => setMessengerOpen(true));
            sdk.onHide(() => setMessengerOpen(false));
          }
          sdk.show();
          } catch (err) {
            setMessengerOpen(false);
          }
        })
        .catch(() => {
          setMessengerOpen(false);
        });
  }, [canUseIntercom, identityKey, user, openSupportPanel]);

  useEffect(() => {
    const handleOpenChat = () => {
      consumePendingChatOpen();
      openChat();
    };
    const handleOpenSupport = () => {
      consumePendingSupportOpen();
      openSupportPanel();
    };
    const handleShowLauncher = () => {
      if (canShowFloatingLauncher()) document.body.classList.remove('hide-intercom-launcher');
    };
    window.addEventListener(OPEN_INTERCOM_EVENT, handleOpenChat);
    window.addEventListener(OPEN_SUPPORT_WIDGET_EVENT, handleOpenSupport);
    window.addEventListener(SHOW_INTERCOM_LAUNCHER_EVENT, handleShowLauncher);
    return () => {
      window.removeEventListener(OPEN_INTERCOM_EVENT, handleOpenChat);
      window.removeEventListener(OPEN_SUPPORT_WIDGET_EVENT, handleOpenSupport);
      window.removeEventListener(SHOW_INTERCOM_LAUNCHER_EVENT, handleShowLauncher);
    };
  }, [openChat, openSupportPanel]);

  useEffect(() => {
    if (authLoading) return undefined;
    if (consumePendingChatOpen()) openChat();
    else if (consumePendingSupportOpen()) openSupportPanel();
    return undefined;
  }, [authLoading, openChat, openSupportPanel]);

  useEffect(() => {
    const syncHiddenState = () => {
      if (isOnboardingTutorialActive() || document.body.classList.contains('onboarding-tutorial-active')) {
        setSupportOpen(false);
        document.body.classList.add('hide-intercom-launcher');
        if (!messengerOpen) hideIntercomMessenger();
        return;
      }
      if (!canShowFloatingLauncher()) {
        document.body.classList.add('hide-intercom-launcher');
        if (!messengerOpen) hideIntercomMessenger();
        return;
      }
      document.body.classList.remove('hide-intercom-launcher');
    };

    syncHiddenState();
    window.addEventListener('onboarding:start', syncHiddenState);
    window.addEventListener('onboarding:ended', syncHiddenState);
    window.addEventListener('onboarding:updated', syncHiddenState);
    window.addEventListener('welcome-modal-closed', syncHiddenState);

    return () => {
      window.removeEventListener('onboarding:start', syncHiddenState);
      window.removeEventListener('onboarding:ended', syncHiddenState);
      window.removeEventListener('onboarding:updated', syncHiddenState);
      window.removeEventListener('welcome-modal-closed', syncHiddenState);
      document.body.classList.remove('hide-intercom-launcher');
    };
  }, [allowedRoute, showLoader, messengerOpen]);

  if (!mounted || !supportPanelAllowed) return null;

  return createPortal(
    <>
      {/* Replaced by DragonFuryHelpLauncher (.df-help-launcher) */}
      <button
        id="intercom-custom-launcher"
        type="button"
        onClick={openSupportPanel}
        className="pj-intercom-launcher pj-intercom-launcher--hidden"
        aria-hidden="true"
        tabIndex={-1}
      >
        <TabMessagesIcon active />
      </button>
      <SupportWidget
        isOpen={supportOpen}
        onClose={() => setSupportOpen(false)}
        onOpenChat={openChat}
        isAuthenticated={isAuthenticated}
      />
    </>,
    document.body
  );
}
