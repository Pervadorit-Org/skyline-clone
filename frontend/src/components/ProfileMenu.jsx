import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './ProfileMenu.css';

const ICONS = {
  settings: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path fill="currentColor" d="M22.850 14.800l-2-1.150a8.600 8.600 0 0 0 0-3.300l2-1.150a.600.600 0 0 0 .250-.650 11.700 11.700 0 0 0-2.560-4.430.600.600 0 0 0-.700-.110l-2 1.150A8.900 8.900 0 0 0 15 3.510V1.200a.600.600 0 0 0-.440-.540 11.800 11.800 0 0 0-5.120 0A.600.600 0 0 0 9 1.200v2.310a8.900 8.900 0 0 0-2.850 1.650L4.160 4a.600.600 0 0 0-.700.110A11.700 11.700 0 0 0 .900 8.550a.600.600 0 0 0 .260.650l2 1.150a8.600 8.600 0 0 0 0 3.300l-2 1.150a.600.600 0 0 0-.260.650 11.700 11.700 0 0 0 2.560 4.430.600.600 0 0 0 .700.110l2-1.150A8.900 8.900 0 0 0 9 20.490v2.310a.600.600 0 0 0 .440.540 11.800 11.800 0 0 0 5.120 0 .600.600 0 0 0 .440-.540v-2.310a8.900 8.900 0 0 0 2.850-1.650l2 1.150a.600.600 0 0 0 .700-.110 11.700 11.700 0 0 0 2.560-4.430.600.600 0 0 0-.260-.650zM12 15.750a3.750 3.750 0 1 1 0-7.500 3.750 3.750 0 0 1 0 7.500z" />
    </svg>
  ),
  vip: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.800 21H4.200c-.330 0-.600.340-.600.750v1.500c0 .410.270.750.600.750h15.600c.330 0 .600-.340.600-.750v-1.500c0-.410-.270-.750-.600-.750zM22.200 6c-.990 0-1.800 1.010-1.800 2.250 0 .330.060.640.165.930l-2.715 2.030c-.580.430-1.320.190-1.660-.540l-3.050-6.680c.400-.410.660-1.030.660-1.740C13.800 1.010 12.990 0 12 0s-1.800 1.010-1.800 2.250c0 .700.260 1.320.660 1.730L7.810 10.670c-.340.730-1.090.970-1.660.540L3.440 9.180c.100-.280.160-.600.160-.930C3.600 7.010 2.800 6 1.800 6 .810 6 0 7.010 0 8.250S.810 10.500 1.800 10.500c.100 0 .200-.020.290-.040L4.800 19.500h14.400l2.710-9.040c.090.020.190.040.290.040.990 0 1.800-1.010 1.800-2.250S23.190 6 22.200 6z" />
    </svg>
  ),
  referral: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3.360" /><path d="M9.820 14.180l-3.270 3.270M10.360 10.360L5.450 5.450" />
      <circle cx="18.550" cy="19.640" r="1.180" /><path d="M14.180 14.180l4.360 5.450" />
      <circle cx="19.640" cy="4.360" r="2.270" /><path d="M17.450 6.550l-3.270 3.270" />
      <circle cx="4.910" cy="4.910" r="1.730" /><circle cx="4.910" cy="19.090" r="2.820" />
    </svg>
  ),
  transactions: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      <path d="M19 1.500H5a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-18a1 1 0 0 0-1-1z" />
      <path d="M10.500 6.500h6M10.500 11.500h6M10.500 16.500h6" />
      <circle cx="7.500" cy="6.500" r=".6" fill="currentColor" /><circle cx="7.500" cy="11.500" r=".6" fill="currentColor" /><circle cx="7.500" cy="16.500" r=".6" fill="currentColor" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 25" fill="currentColor" aria-hidden="true">
      <path d="M16 17.590v-3H9v-4h7v-3l5 5-5 5zM14 2.590c.530 0 1.040.210 1.410.580.380.380.590.890.590 1.420v2h-2v-2H5v16h9v-2h2v2c0 .530-.210 1.040-.590 1.410-.370.380-.880.590-1.410.590H5c-.530 0-1.040-.210-1.420-.590A2 2 0 0 1 3 20.590v-16c0-.530.210-1.040.580-1.420.380-.370.890-.580 1.420-.580h9z" />
    </svg>
  ),
};

const ITEMS = [
  { key: 'settings', label: 'Settings', to: '/settings' },
  { key: 'vip', label: 'VIP', to: '/vip' },
  { key: 'referral', label: 'Referral', to: '/account/affiliate' },
  { key: 'transactions', label: 'Transactions', to: '/account/transactions' },
];

export function ProfileMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative df-profile-trigger-wrap pm-wrap" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="df-profile-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open account menu"
      >
        <svg className="df-profile-trigger__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="7.500" r="4.500" />
          <path d="M3.500 21.500c0-4.700 3.800-7.500 8.500-7.500s8.500 2.800 8.500 7.500z" />
        </svg>
        <img
          className="df-profile-trigger__avatar"
          src={user?.profileImageUrl || `https://api.dicebear.com/9.x/dylan/png?seed=${encodeURIComponent(user?.username || user?.email || 'user')}`}
          alt=""
          draggable="false"
        />
      </button>
      {open ? (
        <div className="pm-menu" role="menu">
          {ITEMS.map((it) => (
            <Link
              key={it.key}
              to={it.to}
              role="menuitem"
              className={`pm-item${pathname === it.to ? ' is-active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className="pm-ic">{ICONS[it.key]}</span>
              <span className="pm-label">{it.label}</span>
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            className="pm-item"
            onClick={() => {
              setOpen(false);
              onLogout?.();
            }}
          >
            <span className="pm-ic">{ICONS.logout}</span>
            <span className="pm-label">Logout</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
