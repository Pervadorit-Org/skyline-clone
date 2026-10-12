import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePageContentReady } from '../../context/PageReadyContext';
import './off-market.css';

const IMG = '/df-online/platforms';

/* Platform tiles — art from public/df-online/platforms */
const PLATFORMS = [
  ['Orion Stars', 'orion-stars'],
  ['Fire Kirin', 'fire-kirin'],
  ['Game Vault', 'game-vault'],
  ['Juwa', 'juwa'],
  ['Cash Machine', 'cash-machine'],
  ['Mafia', 'mafia'],
  ['Panda Master', 'panda-master'],
  ['Milky Way', 'milky-way'],
  ['Joker', 'joker'],
  ['Ultra Panda', 'ultra-panda'],
  ['Mega Spin', 'mega-spin'],
  ['Dragon Fury', 'dragon-fury'],
];

/* Placeholder redemption feed — replace with real data when an endpoint exists */
const WINNERS = [
  ['yifn*****@gmail.com', '193.94', 'Milky Way', 'milky-way'],
  ['rzuyf*****@gmail.com', '271.42', 'Orion Stars', 'orion-stars'],
  ['rwdhg*****@gmail.com', '271.42', 'Fire Kirin', 'fire-kirin'],
  ['jac*****@gmail.com', '436.03', 'Juwa', 'juwa'],
  ['coty.*****@gmail.com', '339.83', 'Game Vault', 'game-vault'],
];

export function PlatformGames() {
  const { isAuthenticated } = useAuth();
  usePageContentReady(true);

  const actionTo = isAuthenticated ? { pathname: '/', hash: '#games' } : '/register';
  const actionLabel = isAuthenticated ? 'Play' : 'Sign up';

  return (
    <main className="om-page">
      <h1 className="om-title">Exclusive platforms</h1>

      <div className="om-banner">
        <div className="om-banner-text">
          <p className="om-banner-lead">Play &amp; win with</p>
          <p className="om-banner-accent">sweep coins</p>
        </div>
        <div className="om-banner-man" aria-hidden="true" />
      </div>

      <section className="om-winners-wrap">
        <div className="om-winners" aria-label="Recent redemptions">
          <div className="om-winners-track" role="list">
          {[...WINNERS, ...WINNERS].map(([mail, amt, name, slug], i) => (
            <div key={i} className="om-winner-slot" role="listitem">
              <div className="om-ring om-winner">
                <div className="om-winner-gap" />
                <img src={`${IMG}/${slug}.webp`} alt={name} draggable="false" loading="lazy" className="om-winner-logo" />
                <div className="om-winner-body">
                  <p className="om-winner-mail">{mail}</p>
                  <p className="om-winner-amt">Redeemed {amt}</p>
                  <p className="om-winner-name">In {name}</p>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>
      </section>

      <div className="om-grid">
        {PLATFORMS.map(([name, slug]) => (
          <div key={slug} className="om-ring om-card">
            <img src={`${IMG}/${slug}.webp`} alt={name} loading="lazy" className="om-card-img" />
            <div className="om-card-fade" />
            <div className="om-card-cta">
              <Link to={actionTo} className="om-ring om-play" aria-label={`${actionLabel} — ${name}`}>
                <span>{actionLabel}</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
