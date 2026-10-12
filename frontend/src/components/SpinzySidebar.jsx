import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { openSupportWidget } from './intercomApi';
import { openTaskList } from './Tasks/TaskListModal';
import { DashboardSidebar, RAIL_ITEMS } from './Home/DashboardSidebar';
import '../styles/dashboard-sidebar.css';

/* Persistent icon-only rail for logged-in users (click an icon → navigate). */
function IconRail({ onNavigate }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { logout } = useAuth();

  const isActive = (to) => {
    if (!to || to === '/casino') return false;
    return pathname === to || pathname.startsWith(`${to}/`);
  };
  const handle = (it) => {
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

  return (
    <aside className="dgs-rail" aria-label="Sidebar">
      <div className="dgs-rail__list">
        {RAIL_ITEMS.map((it, i) =>
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
              {it.badge ? <span className="dgs-rail__badge">{it.badge}</span> : null}
            </button>
          )
        )}
      </div>
    </aside>
  );
}

/**
 * App sidebar.
 *  - Logged-in: a persistent icon rail + an expand drawer (header hamburger).
 *  - Guest: only the expand drawer (header hamburger). Guest behavior unchanged.
 */
export function SpinzySidebar() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuth();

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

  // reserve rail space (desktop) only while logged in
  useEffect(() => {
    if (isAuthenticated) {
      document.documentElement.dataset.railDock = '1';
    } else {
      delete document.documentElement.dataset.railDock;
    }
    return () => {
      delete document.documentElement.dataset.railDock;
    };
  }, [isAuthenticated]);

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
      {isAuthenticated ? <IconRail onNavigate={close} /> : null}

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
