import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { storeLinkClick } from './Store/storeModalEvents';
import { useAuth } from '../context/AuthContext';
import { openSupportWidget } from './intercomApi';
import './BottomBar.css';

/** Notch geometry copied from the reference mobile nav (viewBox 112.4 x 35). */
const NOTCH_STROKE =
  'M0.5 34.5C3.142 34.5 5.141 34.4999 6.695 34.4316C8.247 34.3635 9.396 34.2268 10.33 33.9365C11.513 33.5685 12.142 33.3838 12.704 33.0752C13.266 32.7666 13.759 32.3341 14.704 31.5322C15.096 31.1992 15.573 30.6437 16.147 29.8818C16.727 29.1123 17.428 28.1039 18.269 26.8428C19.952 24.3201 22.213 20.7601 25.221 16.0234C31.312 6.43258 42.501 0.5 56.2 0.5C70.456 0.5 81.941 5.53152 87.844 15.7871C90.546 20.4835 92.578 24.0147 94.111 26.5303C94.878 27.7882 95.524 28.7996 96.07 29.5791C96.611 30.3516 97.071 30.923 97.469 31.2812C98.395 32.117 98.917 32.5883 99.517 32.9355C100.118 33.2828 100.787 33.5006 101.973 33.8867C102.943 34.2021 104.112 34.3515 105.679 34.4258C107.246 34.5001 109.251 34.5 111.9 34.5';
const NOTCH_FILL = `${NOTCH_STROKE}L0.5 34.5Z`;
const BODY =
  'M159.3 34.5L270.7 34.5H401.99C406.899 34.5 410.555 34.5007 413.452 34.708C416.345 34.915 418.441 35.3263 420.237 36.1279C423.444 37.5589 426.039 39.837 427.66 42.624C428.563 44.1762 429.029 45.989 429.264 48.5088C429.5 51.037 429.5 54.2301 429.5 58.5332V102.5H0.5V58.5332C0.5 54.2301 0.500488 51.037 0.736328 48.5088C0.97139 45.989 1.437 44.1762 2.33984 42.624C3.96118 39.837 6.55628 37.5589 9.7627 36.1279C11.559 35.3263 13.6549 34.915 16.5479 34.708C19.445 34.5007 23.1006 34.5 28.0098 34.5Z';

function NavBackground() {
  return (
    <div className="gd-nav__bg" aria-hidden="true">
      <svg className="gd-nav__body" viewBox="0 0 430 103" preserveAspectRatio="none" fill="none">
        <path d={BODY} className="gd-fill-surface" />
        <path d={BODY} stroke="url(#gdNavGrad1)" vectorEffect="non-scaling-stroke" mask="url(#gdNavMask)" />
        <path d={BODY} stroke="url(#gdNavGrad2)" vectorEffect="non-scaling-stroke" mask="url(#gdNavMask)" />
        <defs>
          <linearGradient id="gdNavGrad1" x1="0" y1="51" x2="430" y2="51" gradientUnits="userSpaceOnUse">
            <stop stopColor="#121421" />
            <stop offset="0.147871" stopColor="#F2F4F8" />
            <stop offset="0.5" stopColor="#F2F4F8" />
            <stop offset="0.85" stopColor="#F2F4F8" />
            <stop offset="1" stopColor="#121421" />
          </linearGradient>
          <linearGradient id="gdNavGrad2" x1="215" y1="0" x2="215" y2="35" gradientUnits="userSpaceOnUse">
            <stop stopColor="#121421" stopOpacity="1" />
            <stop offset="1" stopColor="#121421" stopOpacity="0" />
          </linearGradient>
          <mask id="gdNavMask" x="0" y="0" width="430" height="103" maskUnits="userSpaceOnUse">
            <rect x="0" y="30" width="430" height="10" fill="white" />
            <g transform="translate(157.8 0)">
              <path d={NOTCH_FILL} fill="black" />
              <path d={NOTCH_FILL} fill="black" transform="translate(0 2)" />
            </g>
          </mask>
        </defs>
      </svg>
      <svg className="gd-nav__notch" viewBox="0 0 112.4 35" preserveAspectRatio="xMidYMax meet" fill="none">
        <path d={NOTCH_FILL} className="gd-fill-surface" />
        <path d={NOTCH_FILL} className="gd-fill-surface" transform="translate(0 1)" />
      </svg>
      <svg className="gd-nav__notch-stroke" viewBox="0 0 112.4 35" preserveAspectRatio="xMidYMax meet" fill="none">
        <path d={NOTCH_FILL} className="gd-fill-surface" />
        <path d={NOTCH_STROKE} stroke="#fff" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function Item({ icon, label, to, onClick, active }) {
  const body = (
    <>
      <img src={`/ref/mobile/${icon}.webp`} alt="" aria-hidden="true" width={26} height={26} className="gd-nav__icon" />
      <span>{label}</span>
    </>
  );
  const cls = `gd-nav__item${active ? ' is-active' : ''}`;
  return to ? (
    <NavLink to={to} onClick={onClick} className={cls}>{body}</NavLink>
  ) : (
    <button type="button" onClick={onClick} className={cls}>{body}</button>
  );
}

export function BottomBar() {
  const { isAuthenticated } = useAuth();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const registerPath = `/register${search || ''}`;

  const openMenu = () => window.dispatchEvent(new CustomEvent('df-rail-toggle'));
  const openSupport = () => {
    try {
      openSupportWidget();
    } catch (_) {
      navigate('/help');
    }
  };
  const openWallet = (e) => {
    if (!isAuthenticated) {
      e.preventDefault();
      navigate(registerPath);
      return;
    }
    storeLinkClick('buy')(e);
  };

  return (
    <nav className="gd-nav mobile-lobby-nav-reset onboarding-bottom-bar" aria-label="Main navigation">
      <NavBackground />
      <div className="gd-nav__grid">
        <Item icon="menu" label="Menu" onClick={openMenu} />
        <Item icon="casino" label="Lobby" to="/" active={pathname === '/'} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
        <div className="gd-nav__center">
          <NavLink
            to={isAuthenticated ? '/store' : registerPath}
            onClick={openWallet}
            className="gd-nav__wallet"
            aria-label="Wallet"
          >
            <img src="/ref/mobile/dragon.webp" alt="" aria-hidden="true" width={70} height={70} className="gd-nav__dragon" />
            <img src="/ref/mobile/egg.webp" alt="" aria-hidden="true" width={41} height={44} className="gd-nav__egg" />
          </NavLink>
          <span className="gd-nav__wallet-label">Wallet</span>
        </div>
        <Item icon="platform" label="Platforms" to="/platform-games" active={pathname.startsWith('/platform')} />
        <Item icon="chat" label="Support" onClick={openSupport} />
      </div>
    </nav>
  );
}
