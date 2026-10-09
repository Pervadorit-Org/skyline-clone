import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AUTH_LOBBY_LINKS } from '../constants/authLobbyLinks';
import { BG_MUSIC_MUTED_STORAGE_KEY } from './backgroundMusicTracks';
import { openSupportWidget } from './intercomApi';
import { SiteLogo } from './SiteLogo';

function readMusicMuted() {
  try {
    return localStorage.getItem(BG_MUSIC_MUTED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Line icons (24px grid) keyed by AUTH_LOBBY_LINKS id. */
const ICON_PATHS = {
  home: <path d="m3 11 9-8 9 8M5 10v10h5v-6h4v6h5V10" />,
  games: <path d="M6 11h4M8 9v4M15 12h.01M18 10h.01M7 6h10a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4l-2-2H9l-2 2a4 4 0 0 1-4-4v-4a4 4 0 0 1 4-4Z" />,
  store: <path d="M5 8h14l-1 12H6L5 8Zm4 0V6a3 3 0 0 1 6 0v2" />,
  redeem: <path d="M4 9h16v4H4zM12 9v11M5 13v7h14v-7M12 9S10 4 8 5s0 4 4 4Zm0 0s2-5 4-4-0 4-4 4Z" />,
  bonus: <path d="M20 12v8H4v-8M2 7h20v5H2zM12 7v13M12 7S9 2 7 3.5 8 7 12 7Zm0 0s3-5 5-3.5S16 7 12 7Z" />,
  promotions: <path d="m3 12 9-9h8v8l-9 9-8-8Zm13-4h.01" />,
  spin: <path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" />,
  refer: <path d="M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 20v-2a4 4 0 0 0-3-3.9M16 3.1a3.5 3.5 0 0 1 0 6.8" />,
  profile: <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />,
  txns: <path d="M4 7h16M4 12h16M4 17h10" />,
  install: <path d="M12 3v12m0 0-4-4m4 4 4-4M4 19h16" />,
  blog: <path d="M5 4h14v16H5zM9 9h6M9 13h6M9 17h3" />,
  support: <path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v5H4zM17 14h3v5h-3zM20 19a4 4 0 0 1-4 3h-3" />
};

function Icon({ id }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[id] || ICON_PATHS.home}
    </svg>
  );
}

/**
 * Mobile hamburger menu: a drawer that slides in from the left.
 * Stays mounted so the slide animation runs both ways.
 */
export function DfQuickMenu({ open, onClose, anchorRef }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { logout, isAuthenticated, user } = useAuth();
  const panelRef = useRef(null);
  const [muted, setMuted] = useState(readMusicMuted);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
        anchorRef?.current?.focus?.();
      }
    };
    window.addEventListener('keydown', onKey);
    document.body.classList.add('df-drawer-open');
    panelRef.current?.querySelector('button, a')?.focus?.();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('df-drawer-open');
    };
  }, [open, onClose, anchorRef]);

  // Close when the route changes (e.g. browser back).
  useEffect(() => {
    if (open) onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    try {
      localStorage.setItem(BG_MUSIC_MUTED_STORAGE_KEY, next ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('bg-music:set-muted', { detail: { muted: next } }));
    } catch (_) {}
  };

  const go = (to) => {
    onClose?.();
    navigate(to);
  };

  const handleHelp = () => {
    onClose?.();
    try {
      openSupportWidget();
    } catch (_) {
      navigate('/help');
    }
  };

  const handleLogout = () => {
    onClose?.();
    logout();
    navigate('/');
  };

  const name = user?.username || user?.firstName || '';

  const drawer = (
    <div className={`df-drawer${open ? ' is-open' : ''}`} aria-hidden={!open}>
      <button
        type="button"
        className="df-drawer__backdrop"
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        id="dragonfury-quick-menu"
        className="df-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
      >
        <div className="df-drawer__head">
          <SiteLogo variant="drawer" className="df-drawer__logo" />
          <button
            type="button"
            className="df-drawer__close"
            aria-label="Close menu"
            tabIndex={open ? 0 : -1}
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {name ? <p className="df-drawer__user">Signed in as <strong>{name}</strong></p> : null}

        <nav className="df-drawer__nav" aria-label="Lobby links">
          {AUTH_LOBBY_LINKS.map((item) => {
            const active = item.match?.(pathname);
            return (
              <button
                key={item.id}
                type="button"
                tabIndex={open ? 0 : -1}
                className={`df-drawer__link${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  if (item.openLiveChat) {
                    handleHelp();
                    return;
                  }
                  go(isAuthenticated ? item.to : '/register');
                }}
              >
                <Icon id={item.id} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="df-drawer__foot">
          <button type="button" tabIndex={open ? 0 : -1} className="df-drawer__link" aria-pressed={!muted} onClick={toggleSound}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 5 6 9H3v6h3l5 4V5Z" />
              {muted ? <path d="m16 9 5 6m0-6-5 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
            </svg>
            <span>{muted ? 'Sound off' : 'Sound on'}</span>
          </button>
          <button type="button" tabIndex={open ? 0 : -1} className="df-drawer__link df-drawer__link--danger" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </div>
  );

  return createPortal(drawer, document.body);
}
