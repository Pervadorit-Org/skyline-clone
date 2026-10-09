import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { openSupportWidget } from './intercomApi';


const I = {
  shop: <path d="M5 8h14l-1 12H6L5 8Zm4 0V6a3 3 0 0 1 6 0v2" />,
  redeem: <path d="M4 9h16v4H4zM12 9v11M5 13v7h14v-7M12 9S10 4 8 5s0 4 4 4Zm0 0s2-5 4-4-0 4-4 4Z" />,
  home: <path d="m3 11 9-8 9 8M5 10v10h5v-6h4v6h5V10" />,
  bonus: <path d="M20 12v8H4v-8M2 7h20v5H2zM12 7v13M12 7S9 2 7 3.5 8 7 12 7Zm0 0s3-5 5-3.5S16 7 12 7Z" />,
  support: <path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v5H4zM17 14h3v5h-3zM20 19a4 4 0 0 1-4 3h-3" />
};

function NavIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {I[name]}
    </svg>
  );
}

function hudItemClass(base, isActive) {
  return `df-nav-hud__item df-nav-hud__item--${base}${isActive ? ' df-nav-hud__item--active' : ''}`;
}

export function BottomBar() {
  const { isAuthenticated, bscWalletUsable } = useAuth();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const registerPath = `/register${search || ''}`;
  const isOnHome = pathname === '/';
  const bonusHighlighted = pathname === '/bonus' || pathname === '/account/affiliate';
  const bonusCount = Math.max(0, Math.floor(Number(bscWalletUsable) || 0));

  const handleHomeNav = (e) => {
    e.preventDefault();
    if (isOnHome) {
      navigate('/', { replace: true });
    } else {
      navigate('/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSupport = (e) => {
    e.preventDefault();
    try {
      openSupportWidget();
    } catch (_) {
      navigate('/help');
    }
  };

  const shopTo = isAuthenticated ? '/store' : registerPath;
  const redeemTo = isAuthenticated ? '/redeem' : registerPath;

  return (
    <nav
      className="mobile-lobby-nav df-nav-hud mobile-lobby-nav--lobby onboarding-bottom-bar"
      aria-label="Lobby navigation"
    >
      <NavLink
        to={shopTo}
        className={({ isActive }) =>
          hudItemClass('shop', isAuthenticated ? pathname === '/deposit' || pathname === '/store' : isActive)
        }
      >
        <span className="df-nav-hud__art"><NavIcon name="shop" /></span>
        <small className="df-nav-hud__label">Shop</small>
      </NavLink>

      <NavLink
        to={redeemTo}
        className={() => hudItemClass('redeem', pathname === '/redeem' || pathname === '/withdraw')}
      >
        <span className="df-nav-hud__art"><NavIcon name="redeem" /></span>
        <small className="df-nav-hud__label">Redeem</small>
      </NavLink>

      <NavLink
        to="/"
        onClick={handleHomeNav}
        className={hudItemClass('home', isOnHome)}
        aria-current={isOnHome ? 'page' : undefined}
      >
        <span className="df-nav-hud__art"><NavIcon name="home" /></span>
        <small className="df-nav-hud__label">Home</small>
      </NavLink>

      <NavLink
        to="/bonus"
        className={hudItemClass('bonus', bonusHighlighted)}
        aria-current={bonusHighlighted ? 'page' : undefined}
      >
        <span className="df-nav-hud__art">
          <NavIcon name="bonus" />
          {bonusCount > 0 ? (
            <span className="df-nav-hud__counter" aria-label={`Bonus balance ${bonusCount}`}>
              {bonusCount}
            </span>
          ) : null}
        </span>
        <small className="df-nav-hud__label">Bonus</small>
      </NavLink>

      <button
        type="button"
        className={hudItemClass('support', false)}
        aria-label="Open live chat support"
        onClick={handleSupport}
      >
        <span className="df-nav-hud__art"><NavIcon name="support" /></span>
        <small className="df-nav-hud__label">Support</small>
      </button>
    </nav>
  );
}
