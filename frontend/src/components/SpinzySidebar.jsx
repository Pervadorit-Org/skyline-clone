import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useClaimableTaskCount } from './Tasks/useClaimableTaskCount';
import { openSupportWidget } from './intercomApi';
import { openTaskList } from './Tasks/TaskListModal';
import { DashboardSidebar, RAIL_ITEMS, applyRailShell } from './Home/DashboardSidebar';
import { useLobbyShell } from '../hooks/useLobbyShell';
import '../styles/dashboard-sidebar.css';

/* Persistent icon-only rail (click an icon → navigate). Shown to logged-in
   players and to guests browsing non-landing pages. For guests, login-gated
   items open the auth modal instead of navigating into protected routes. */
function IconRail({ onNavigate, isGuest = false }) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { logout } = useAuth();
  const claimableTasks = useClaimableTaskCount(!isGuest);
  const shell = useLobbyShell();

  const isActive = (to) => {
    if (!to || to === '/casino') return false;
    return pathname === to || pathname.startsWith(`${to}/`);
  };
  const handle = (it) => {
    if (isGuest) {
      // Login-gated features (account, rewards, tasks) → open the login modal.
      if (it.action === 'tasks' || it.authRequired) {
        navigate(`/login${search || ''}`);
      } else if (it.action === 'support') {
        openSupportWidget();
      } else if (it.to) {
        navigate(it.to);
      }
      onNavigate?.();
      return;
    }
    if (it.action === 'support') {
      openSupportWidget();
    } else if (it.action === 'tasks') {
      openTaskList();
    } else if (it.action === 'logout') {
      logout?.();
    } else if (it.to) {
      navigate(it.to);
    }
    onNavigate?.();
  };

  // Guests have no session to log out of; hide the logout control for them.
  const items = applyRailShell(
    isGuest ? RAIL_ITEMS.filter((it) => it.action !== 'logout') : RAIL_ITEMS,
    shell
  );

  return (
    <aside className="dgs-rail" aria-label="Sidebar">
      <div className="dgs-rail__list">
        {items.map((it, i) =>
          it.divider ? (
            <hr key={`d${i}`} className="dgs-rail__div" aria-hidden />
          ) : (
            <button
              key={it.id}
              type="button"
              className={`dgs-rail__btn${isActive(it.to) ? ' is-active' : ''}`}
              title={it.label}
              aria-label={it.label}
              onClick={() => handle(it)}
            >
              {it.icon}
              {(() => {
                const badge = it.id === 'tasks' ? (claimableTasks > 0 ? String(claimableTasks) : '') : it.badge;
                return badge && !isGuest ? <span className="dgs-rail__badge">{badge}</span> : null;
              })()}
            </button>
          )
        )}
      </div>
    </aside>
  );
}

const AUTH_PAGES = new Set([
  '/login',
  '/register',
  '/check-email',
  '/forgot-password',
  '/reset-password',
]);

/**
 * App sidebar.
 *  - Logged-in: a persistent icon rail + an expand drawer (header hamburger).
 *  - Guest on a non-landing page (e.g. /casino): the same icon rail, with
 *    login-gated items opening the auth modal, + the drawer.
 *  - Guest on the landing / auth pages: only the expand drawer.
 */
export function SpinzySidebar() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, loading } = useAuth();
  const { pathname } = useLocation();

  // Guests see the rail everywhere except the landing page and auth screens.
  const showGuestRail =
    !loading && !isAuthenticated && pathname !== '/' && !AUTH_PAGES.has(pathname);
  const showRail = isAuthenticated || showGuestRail;

  useEffect(() => {
    const toggle = () => setOpen((v) => !v);
    const openEvt = () => setOpen(true);
    const closeEvt = () => setOpen(false);
    window.addEventListener('df-rail-toggle', toggle);
    window.addEventListener('df-rail-open', openEvt);
    window.addEventListener('df-rail-close', closeEvt);
    return () => {
      window.removeEventListener('df-rail-toggle', toggle);
      window.removeEventListener('df-rail-open', openEvt);
      window.removeEventListener('df-rail-close', closeEvt);
    };
  }, []);

  // reserve rail space (desktop) whenever the rail is shown
  useEffect(() => {
    if (showRail) {
      document.documentElement.dataset.railDock = '1';
    } else {
      delete document.documentElement.dataset.railDock;
    }
    return () => {
      delete document.documentElement.dataset.railDock;
    };
  }, [showRail]);

  // lock page scroll while the drawer is open
  useEffect(() => {
    const cls = 'dgs-scroll-lock';
    document.documentElement.classList.toggle(cls, open);
    return () => document.documentElement.classList.remove(cls);
  }, [open]);

  // close on Escape
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      {showRail ? <IconRail onNavigate={close} isGuest={!isAuthenticated} /> : null}

      <div className={`dgs-overlay${open ? ' is-open' : ''}`} aria-hidden={!open}>
        <div className="dgs-backdrop" onClick={close} />
        <div className="dgs-drawer" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="dgs-close" aria-label="Close menu" onClick={close}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <DashboardSidebar onNavigate={close} isAuthenticated={isAuthenticated} />
        </div>
      </div>
    </>
  );
}

export default SpinzySidebar;
