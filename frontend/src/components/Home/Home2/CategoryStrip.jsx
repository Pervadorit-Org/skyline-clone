import { Link } from 'react-router-dom';
import { useHomeConfig } from '../../../config/homeConfigContext';

// Our own house glyph for the Home tab (not goldendragon.casino's hosted icon).
function HomeIcon() {
  return (
    <svg width="22" height="20" viewBox="0 0 24 21" fill="none" aria-hidden="true" className="df-home2-catstrip__icon">
      <path
        fill="currentColor"
        d="M11.68 5.45 4 12.57v7.68c0 .2.07.39.2.53.12.14.29.22.47.22l4.66-.01a.73.73 0 0 0 .67-.75v-4.49c0-.2.07-.39.2-.53.12-.14.29-.22.47-.22h2.66c.18 0 .35.08.47.22.13.14.2.33.2.53v4.48a.74.74 0 0 0 .74.75l4.67.01c.18 0 .35-.08.47-.22a.8.8 0 0 0 .2-.53v-7.69l-7.68-7.11a.44.44 0 0 0-.64 0ZM23.82 10.29 20.33 7.06V.56a.56.56 0 0 0-.56-.56H17.5a.56.56 0 0 0-.56.56v3.4L13.27.52a1.93 1.93 0 0 0-2.54 0L.18 10.29a.55.55 0 0 0-.07.79l1.06 1.45c.09.12.22.2.37.21.15.02.3-.03.42-.12l9.8-9.09a.44.44 0 0 1 .64 0l9.8 9.09c.11.09.26.14.41.12a.56.56 0 0 0 .38-.21l1.06-1.45a.56.56 0 0 0-.07-.79Z"
      />
    </svg>
  );
}

// Horizontal, scrollable game-category strip. First item renders active (gold).
export function CategoryStrip() {
  const homeConfig = useHomeConfig();
  const items = homeConfig.categoryStrip?.items || [];
  if (items.length === 0) return null;
  return (
    <div className="df-home2-catstrip">
      <div className="df-home2-catstrip__scroll">
        {items.map((item, i) => (
          <Link
            key={item.label}
            to={item.href}
            draggable="false"
            className={`df-home2-catstrip__tab${i === 0 ? ' df-home2-catstrip__tab--active' : ''}`}
            aria-current={i === 0 ? 'page' : undefined}
          >
            <span className="df-home2-catstrip__icon-wrap" aria-hidden="true">
              {item.icon === 'home' ? <HomeIcon /> : <span className="df-home2-catstrip__emoji">{item.emoji}</span>}
            </span>
            <span className="df-home2-catstrip__label">{item.label}</span>
          </Link>
        ))}
        <div className="df-home2-catstrip__pad" aria-hidden="true" />
      </div>
    </div>
  );
}

export default CategoryStrip;
