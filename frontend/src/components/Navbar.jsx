import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SiteLogo } from './SiteLogo';
import { storeLinkClick } from './Store/storeModalEvents';
import '../styles/gd-mobile-header.css';
import { lockBodyScroll } from '../utils/bodyScrollLock';
import { PhoneVerifyGateModal } from './Auth/PhoneVerifyGateModal';
import { DfWalletHud } from './DfWalletHud';
import { DfQuickMenu } from './DfQuickMenu';
import { DfProfilePopup } from './DfProfilePopup';
import { ProfileMenu } from './ProfileMenu';
import * as notificationsApi from '../api/notifications';
import { OPEN_MOBILE_MENU_EVENT } from '../utils/navEvents';
import { AUTH_LOBBY_LINKS } from '../constants/authLobbyLinks';
import { useLobbyShell } from '../hooks/useLobbyShell';
import { isSafeHttpUrl, isSafeInternalPath } from '../utils/safeUrl';

const HEADER_PAGE_LINKS = [
  { id: 'guest-play', to: '/casino', label: 'Play', match: (path) => path === '/casino' || path.startsWith('/casino/') },
  { id: 'guest-bonuses', to: '/bonus', label: 'Bonuses', match: (path) => path === '/bonus' || path === '/promotions' },
  { id: 'guest-how', to: '/faq', label: 'How to Play', match: (path) => path === '/faq' },
  { id: 'guest-updates', to: '/blog', label: 'Updates', match: (path) => path === '/blog' || path.startsWith('/blog/') },
  { id: 'guest-support', to: '/contact', label: 'Support', match: (path) => path === '/contact' }
];

function HeaderPageLinks({ pathname }) {
  const shell = useLobbyShell();
  return (
    <nav className="df-nav-links" aria-label="Site">
      {HEADER_PAGE_LINKS.filter(({ id }) => !shell.hidden('header', id)).map(({ id, to, label, match }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `df-nav-link${isActive || match(pathname) ? ' is-active' : ''}`}
        >
          {shell.label('header', id, label)}
        </NavLink>
      ))}
    </nav>
  );
}

function DesktopAuthNav({ pathname }) {
  const shell = useLobbyShell();
  return (
    <nav className="df-desktop-auth-nav" aria-label="Primary navigation">
      {AUTH_LOBBY_LINKS.filter((link) => link.desktop !== false && !shell.hidden('header', link.id)).map(({ to, label, match, id }) => (
        <NavLink
          key={id}
          to={to}
          className={() => (match(pathname) ? 'df-desktop-auth-nav__active' : undefined)}
          end={to === '/'}
        >
          {shell.label('header', id, label)}
        </NavLink>
      ))}
    </nav>
  );
}

// Decorative hover sparkles for the guest Login/Sign Up pills — a generic
// four-point sparkle glyph (own path data, not copied from any reference site).
function DfNavSparkles() {
  const spec = [
    { cls: 'df-nav-sparkle__dot--a', size: 9 },
    { cls: 'df-nav-sparkle__dot--b', size: 11 },
    { cls: 'df-nav-sparkle__dot--c', size: 8 },
    { cls: 'df-nav-sparkle__dot--d', size: 13 },
  ];
  return (
    <>
      {spec.map(({ cls, size }) => (
        <svg
          key={cls}
          className={`df-nav-sparkle__dot ${cls}`}
          width={size}
          height={size}
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
        >
          <path d="M5 0c0 2.2 1.8 4 4 4-2.2 0-4 1.8-4 4 0-2.2-1.8-4-4-4 2.2 0 4-1.8 4-4Z" fill="url(#df-nav-sparkle-grad)" />
          <defs>
            <linearGradient id="df-nav-sparkle-grad" x1="1" y1="9" x2="9" y2="1" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFD12E" />
              <stop offset="1" stopColor="#FF7C1D" />
            </linearGradient>
          </defs>
        </svg>
      ))}
    </>
  );
}

function formatNotificationDate(createdAt) {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  const now = new Date();
  const diffMs = now - d;
  if (diffMs < 60000) return 'Just now';
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
  return d.toLocaleDateString(undefined, { dateStyle: 'short' });
}

export function Navbar() {
  const {
    user,
    isAuthenticated,
    loading: authLoading,
    logout,
    refreshUser,
    balanceSc,
    pscWalletUsable,
    bscWalletUsable,
    rscWalletUsable,
    lockedBalanceSc,
    balanceLoading,
    gcEnabled,
    balanceGc,
    currencyMode,
    switchCurrencyMode
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);
  const menuBtnRef = useRef(null);
  const prevUnreadRef = useRef(0);
  const hasFetchedUnreadOnceRef = useRef(false);
  const notificationAudioRef = useRef(null);
  const [scBreakdownOpen, setScBreakdownOpen] = useState(false);
  const [modeSwitching, setModeSwitching] = useState(false);
  const [phoneUnlockOpen, setPhoneUnlockOpen] = useState(false);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [guestMenuOpen, setGuestMenuOpen] = useState(false);
  const guestMenuRef = useRef(null);
  const lockedSc = Number(lockedBalanceSc) || 0;
  const unlockedTotal = Number(balanceSc) || 0;
  const pillAmount = unlockedTotal > 0 ? unlockedTotal : lockedSc;
  const isDashboardLayout =
    location.pathname === '/' ||
    location.pathname === '/link2play' ||
    location.pathname === '/bonus' ||
    location.pathname === '/casino' ||
    location.pathname.startsWith('/casino/') ||
    location.pathname.startsWith('/category/');
  // Landing-style hero nav only on the home page and the auth overlays that
  // render Home behind them; other guest pages use the compact lobby header.
  const isGuestLanding =
    !isAuthenticated &&
    !authLoading &&
    (location.pathname === '/' ||
      location.pathname === '/login' ||
      location.pathname === '/register');
  const registerPath = `/register${location.search || ''}`;
  const loginPath = `/login${location.search || ''}`;

  const playNotificationSound = useCallback(() => {
    try {
      if (!notificationAudioRef.current) {
        notificationAudioRef.current = new Audio('/notification.mp3');
      }
      const audio = notificationAudioRef.current;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch (_) {}
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationsApi.getUnreadCount();
      const count = res?.unread_count ?? 0;
      const hadPreviousFetch = hasFetchedUnreadOnceRef.current;
      if (count > prevUnreadRef.current) {
        window.dispatchEvent(new Event('wallet:refresh'));
        if (hadPreviousFetch) playNotificationSound();
      }
      hasFetchedUnreadOnceRef.current = true;
      prevUnreadRef.current = count;
      setUnreadCount(count);
    } catch (_) {}
  }, [isAuthenticated, playNotificationSound]);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationsApi.getNotifications({ limit: 20 });
      setNotifications(res?.notifications ?? []);
      await fetchUnreadCount();
    } catch (_) {}
  }, [isAuthenticated, fetchUnreadCount]);

  useEffect(() => {
    setProfileOpen(false);
    setNotifOpen(false);
    setScBreakdownOpen(false);
    setQuickMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const openFromPage = () => setQuickMenuOpen(true);
    window.addEventListener(OPEN_MOBILE_MENU_EVENT, openFromPage);
    return () => window.removeEventListener(OPEN_MOBILE_MENU_EVENT, openFromPage);
  }, []);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount();
        if (notifOpen) fetchNotifications();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isAuthenticated, notifOpen, fetchUnreadCount, fetchNotifications]);

  useEffect(() => {
    function onRefresh() {
      fetchUnreadCount();
    }
    window.addEventListener('notifications:refresh', onRefresh);
    return () => window.removeEventListener('notifications:refresh', onRefresh);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!scBreakdownOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setScBreakdownOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scBreakdownOpen]);

  useEffect(() => {
    if (!scBreakdownOpen) return undefined;
    return lockBodyScroll();
  }, [scBreakdownOpen]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (scBreakdownOpen && !e.target.closest?.('.df-wallet-hud')) setScBreakdownOpen(false);
      if (guestMenuRef.current && !guestMenuRef.current.contains(e.target)) setGuestMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [scBreakdownOpen]);

  useEffect(() => {
    setGuestMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (notifOpen && isAuthenticated) fetchNotifications();
  }, [notifOpen, isAuthenticated, fetchNotifications]);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/');
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllNotificationsRead();
      await fetchNotifications();
    } catch (_) {}
  };

  const handleNotificationClick = (n) => {
    setNotifOpen(false);
    const url = n.action_url;
    if (url) {
      if (isSafeInternalPath(url)) navigate(url);
      else if (isSafeHttpUrl(url)) window.location.href = url;
    }
    if (!n.read_at && n.id) {
      notificationsApi.markNotificationRead(n.id).then(() => fetchUnreadCount()).catch(() => {});
    }
  };

  return (
    <header
      className={`dash-nav onboarding-navbar${isGuestLanding ? ' dash-nav--guest-landing' : ''}${
        isAuthenticated ? ' dash-nav--authenticated' : ''
      }`}
    >
      <div
        className={`dash-nav-inner ${isAuthenticated ? 'dash-nav-inner--auth' : 'dash-nav-inner--guest'} ${
          isDashboardLayout ? 'dash-nav-inner--wide' : ''
        }${isGuestLanding ? ' dash-nav-inner--guest-landing' : ''}`}
      >
        {isAuthenticated ? (
          <>
            <button
              type="button"
              className="df-rail-burger"
              aria-label="Toggle sidebar"
              onClick={() => window.dispatchEvent(new CustomEvent('df-rail-toggle'))}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link to="/" className="dash-logo dash-nav-auth-logo min-w-0" aria-label="Go to lobby">
              <SiteLogo variant="nav" />
              <img className="gd-head-logo" src="/ref/mobile/logo-small.webp" alt="" width="50" height="50" draggable="false" />
            </Link>
            <Link to="/store" className="gd-head-emblem" aria-label="Open the store" onClick={storeLinkClick('buy')}>
              <img src="/ref/mobile/egg.webp" alt="" width="22" height="24" draggable="false" />
            </Link>

            <div className="df-auth-balances" aria-label="Player balance display">
              <DfWalletHud
                amount={pillAmount}
                balanceLoading={balanceLoading}
                open={scBreakdownOpen}
                onToggle={() => {
                  setScBreakdownOpen((o) => !o);
                  if (localStorage.getItem('onboarding_pending') === 'true') {
                    window.dispatchEvent(new CustomEvent('onboarding:wallet-opened'));
                  }
                }}
                onClose={() => setScBreakdownOpen(false)}
                psc={pscWalletUsable}
                bsc={bscWalletUsable}
                rsc={rscWalletUsable}
                gcEnabled={gcEnabled}
                mode={currencyMode}
                gcAmount={balanceGc}
                switching={modeSwitching}
                onSwitchMode={async (m) => {
                  setModeSwitching(true);
                  try {
                    await switchCurrencyMode(m);
                  } catch {
                    /* keep the current mode; the next balance sync shows the truth */
                  } finally {
                    setModeSwitching(false);
                  }
                }}
                lockedSc={lockedSc}
                onUnlockPhone={() => {
                  setScBreakdownOpen(false);
                  setPhoneUnlockOpen(true);
                }}
              />
            </div>

            <DesktopAuthNav pathname={location.pathname} />

            <div className="dash-nav-end df-lobby-header-actions">
              <ProfileMenu user={user} onLogout={handleLogout} />

              <button
                type="button"
                className="df-tour-btn"
                aria-label="Website tour"
                title="Website tour"
                onClick={() => window.dispatchEvent(new CustomEvent('website-tour:start'))}
              >
                <img src="/df-online/tour.webp" width="44" height="44" alt="" draggable="false" />
              </button>
              <button type="button" className="df-header-logout" aria-label="Log out" title="Log out" onClick={handleLogout}>
                <img src="/df-online/menu/logout.webp" alt="" width={44} height={44} draggable="false" />
              </button>

              <div className="relative df-notif-wrap" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setNotifOpen((o) => !o)}
                  className={`df-header-bell${unreadCount > 0 ? ' df-header-bell--alert' : ''}`}
                  aria-expanded={notifOpen}
                  aria-label={
                    unreadCount > 0 ? `${unreadCount} unread notifications` : 'Open notifications'
                  }
                >
                  <svg className="df-header-bell__icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 22a2.5 2.5 0 0 0 2.4-1.8h-4.8A2.5 2.5 0 0 0 12 22Zm7-6.5V11a7 7 0 0 0-5.5-6.8V3.5a1.5 1.5 0 0 0-3 0v.7A7 7 0 0 0 5 11v4.5L3.5 17v1h17v-1L19 15.5Z" />
                  </svg>
                  <span className="df-header-bell__dot" aria-hidden />
                  {unreadCount > 0 ? <span className="gd-head-badge" aria-hidden>{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
                </button>
                {notifOpen && (
                  <div className="dash-dropdown dash-notif-panel">
                    <div className="dash-notif-header">
                      <span>Notifications</span>
                      {notifications.some((n) => !n.read_at) && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-xs text-[var(--dash-teal)] hover:underline bg-transparent border-0 cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="overflow-y-auto flex-1">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-gray-500 text-center">
                          No notifications yet.
                        </p>
                      ) : (
                        <ul className="py-1">
                          {notifications.map((n) => (
                            <li key={n.id}>
                              <button
                                type="button"
                                onClick={() => handleNotificationClick(n)}
                                className={`w-full text-left px-4 py-3 border-b border-gray-700/60 last:border-0 transition-colors hover:bg-gray-700/50 ${
                                  !n.read_at ? 'bg-primary/5' : ''
                                } ${n.action_url ? 'cursor-pointer' : 'cursor-default'}`}
                              >
                                <p className="text-sm font-medium text-gray-100">{n.title}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{n.message}</p>
                                <p className="text-[10px] text-gray-500 mt-1">
                                  {formatNotificationDate(n.created_at)}
                                  {n.action_url && <span className="ml-1 text-primary">→ View</span>}
                                </p>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                ref={menuBtnRef}
                type="button"
                className={`df-menu-btn${quickMenuOpen ? ' df-menu-btn--open' : ''}`}
                aria-label={quickMenuOpen ? 'Close menu' : 'Open menu'}
                aria-haspopup="menu"
                aria-expanded={quickMenuOpen}
                aria-controls="dragonfury-quick-menu"
                onClick={() => setQuickMenuOpen((o) => !o)}
              >
                <img
                  className="df-menu-btn__dots"
                  src={
                    quickMenuOpen
                      ? '/df-online/menu-close-arrow.webp'
                      : '/df-online/menu-button.png'
                  }
                  width="58"
                  height="60"
                  alt=""
                />
              </button>
            </div>

            <DfQuickMenu
              open={quickMenuOpen}
              onClose={() => setQuickMenuOpen(false)}
              anchorRef={menuBtnRef}
            />
          </>
        ) : (
          <>
            <div className="df-guest-menu" ref={guestMenuRef}>
              <button
                type="button"
                className="df-guest-menu-btn"
                aria-label="Open menu"
                onClick={() => window.dispatchEvent(new CustomEvent('df-rail-toggle'))}
              >
                <svg width="22" height="18" viewBox="0 0 22 18" fill="none" aria-hidden="true">
                  <path d="M1 1h20M1 9h20M1 17h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {!isGuestLanding ? (
              <Link to="/casino" className="dash-logo dash-nav-auth-logo min-w-0 mr-auto" aria-label="Go to lobby">
                <SiteLogo variant="nav" />
              </Link>
            ) : null}
            <div className="dash-nav-actions">
              {/* Tutorial hidden
              <Link to="/help" className="df-tour-btn" aria-label="Website tour" title="Help">
                <img src="/df-online/tour.webp" width="44" height="44" alt="" draggable="false" />
              </Link>
              */}
              <div className="dash-nav-auth">
                <span className="df-nav-sparkle">
                  <DfNavSparkles />
                  <Link to={loginPath} className="dash-btn-login">
                    Login
                  </Link>
                </span>
                <span className="df-nav-sparkle">
                  <DfNavSparkles />
                  <Link to={registerPath} className="dash-btn-signup">
                    Sign Up
                  </Link>
                </span>
              </div>
            </div>
          </>
        )}
      </div>
      {isAuthenticated ? (
        <>
          <DfProfilePopup
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
            user={user}
            balanceSc={balanceSc}
            rsc={rscWalletUsable}
            bsc={bscWalletUsable}
            onLogout={handleLogout}
            refreshUser={refreshUser}
          />
          <PhoneVerifyGateModal open={phoneUnlockOpen} onClose={() => setPhoneUnlockOpen(false)} />
        </>
      ) : null}
    </header>
  );
}
