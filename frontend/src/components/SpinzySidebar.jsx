import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Thin Spinzy-style icon rail. Shown for everyone (guest + logged-in).
// Guests tapping a login-gated item are routed to /login.
// Clean white line-icons (inline SVG) like Spinzy's rail.

const Icon = ({ name }) => {
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 9.5 12 3l9 6.5" />
          <path d="M5 10v10h14V10" />
          <path d="M9 20v-6h6v6" />
        </svg>
      );
    case 'games':
      return (
        <svg {...common}>
          <line x1="6" y1="11" x2="10" y2="11" />
          <line x1="8" y1="9" x2="8" y2="13" />
          <line x1="15" y1="12" x2="15.01" y2="12" />
          <line x1="18" y1="10" x2="18.01" y2="10" />
          <rect x="2" y="6" width="20" height="12" rx="4" />
        </svg>
      );
    case 'store':
      return (
        <svg {...common}>
          <path d="M6 2 3 6v14a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      );
    case 'bonus':
      return (
        <svg {...common}>
          <rect x="3" y="8" width="18" height="4" rx="1" />
          <path d="M12 8v13" />
          <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
          <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" />
        </svg>
      );
    case 'spin':
      return (
        <svg {...common}>
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <path d="M21 3v4h-4" />
        </svg>
      );
    case 'promos':
      return (
        <svg {...common}>
          <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 3 12V5a2 2 0 0 1 2-2h7a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.6Z" />
          <circle cx="7.5" cy="7.5" r="1.3" />
        </svg>
      );
    case 'refer':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
          <path d="M16 3.1a4 4 0 0 1 0 7.8" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
        </svg>
      );
    case 'support':
      return (
        <svg {...common}>
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z" />
          <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3Z" />
        </svg>
      );
    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21v-1a6 6 0 0 1 12 0v1" transform="translate(2 0)" />
        </svg>
      );
    default:
      return null;
  }
};

const NAV = [
  { id: 'home', label: 'Home', icon: 'home', to: '/', auth: false },
  { id: 'games', label: 'Games', icon: 'games', to: '/casino', auth: false },
  { id: 'store', label: 'Buy SC', icon: 'store', to: '/store', auth: true },
  { id: 'bonus', label: 'Bonus', icon: 'bonus', to: '/bonus', auth: true },
  { id: 'spin', label: 'Daily Spin', icon: 'spin', to: '/spin', auth: true },
  { id: 'promos', label: 'Promotions', icon: 'promos', to: '/promotions', auth: false },
  { id: 'refer', label: 'Refer', icon: 'refer', to: '/refer', auth: true },
];

const BOTTOM = [
  { id: 'settings', label: 'Settings', icon: 'settings', to: '/settings', auth: true },
  { id: 'support', label: 'Support', icon: 'support', to: '/support', auth: false },
];

export function SpinzySidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const go = (item) => {
    if (item.auth && !isAuthenticated) {
      navigate('/login');
      return;
    }
    navigate(item.to);
  };

  const isActive = (to) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  const renderItem = (item) => (
    <button
      key={item.id}
      type="button"
      className={`spz-rail__item ${isActive(item.to) ? 'spz-rail__item--active' : ''}`}
      aria-label={item.label}
      title={item.label}
      onClick={() => go(item)}
    >
      <span className="spz-rail__icon">
        <Icon name={item.icon} />
      </span>
    </button>
  );

  return (
    <aside className="spz-rail" aria-label="Main sidebar">
      <div className="spz-rail__top">
        <button
          type="button"
          className="spz-rail__avatar"
          aria-label={isAuthenticated ? 'Profile' : 'Log in'}
          title={isAuthenticated ? 'Profile' : 'Log in'}
          onClick={() => navigate(isAuthenticated ? '/settings' : '/login')}
        >
          {user?.profileImageUrl ? (
            <img src={user.profileImageUrl} alt="" loading="lazy" />
          ) : (
            <span className="spz-rail__icon spz-rail__icon--avatar">
              <Icon name="user" />
            </span>
          )}
        </button>

        <button
          type="button"
          className="spz-rail__vip"
          aria-label="VIP status"
          title="VIP status"
          onClick={() => (isAuthenticated ? navigate('/promotions') : navigate('/login'))}
        >
          <img src="/df-online/sc-coin.webp" alt="" loading="lazy" />
          <span>VIP</span>
        </button>

        <hr className="spz-rail__divider" />

        <nav className="spz-rail__nav">{NAV.map(renderItem)}</nav>
      </div>

      <div className="spz-rail__bottom">
        <hr className="spz-rail__divider" />
        {BOTTOM.map(renderItem)}
      </div>
    </aside>
  );
}

export default SpinzySidebar;
