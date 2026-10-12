import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePageContentReady } from '../../context/PageReadyContext';
import './providers-page.css';

/* [name, slug, logo]. Logos come from /public/providers and /public/partners; others render a wordmark tile. */
const PROVIDERS = [
  ['18 Peaches', '18peaches'], ['7777 Gaming', '7777-gaming'], ['BGaming', 'bgaming', '/partners/bgaming.webp'], ['Bold Play', 'bold-play'],
  ['Chilli Games', 'chilli-games'], ['CQ9', 'cq9', '/partners/cq9_gaming.webp'], ['CT Interactive', 'ct-interactive'],
  ['EGT Digital', 'egt-digital', '/partners/egt_digital.webp'], ['Espresso Games', 'espresso-games'], ['Eurasian Gaming', 'eurasian-gaming'], ['Expanse Studios', 'expanse-studios'],
  ['Fa Chai', 'fa-chai'], ['Felix Gaming', 'felix-gaming'], ['Funky Games', 'funky-games'], ['Game Art', 'game-art'],
  ['Greentube', 'greentube', '/providers/greentube.svg'], ['Inbet', 'inbet'], ['Jili Games', 'jili-games'],
  ['KA Gaming', 'ka-gaming'], ['Mancala Gaming', 'mancala-gaming'], ['Mr Slotty', 'mr-slotty'], ['Net Gaming', 'net-gaming'],
  ['Playsoon', 'playsoon', '/partners/playsoon.webp'], ['Playtech', 'playtech', '/providers/playtech.svg'], ['Pragmatic Play', 'pragmatic', '/providers/pragmatic.svg'],
  ['Quickspin', 'quickspin', '/providers/quickspin.svg'], ['Rogue', 'rogue'], ['RubyPlay', 'rubyplay', '/partners/rubyplay.webp'], ['Spade Gaming', 'spadegaming', '/providers/spadegaming.svg'],
  ['Spin 4 Win', 'spin-4-win'], ['Spinoro', 'spinoro'], ['Spribe', 'spribe', '/providers/spribe.svg'],
  ['Wazdan', 'wazdan', '/providers/wazdan.svg'], ['Zeus Play', 'zeus-play'],
];

export function Providers() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  usePageContentReady(true);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? PROVIDERS.filter(([name]) => name.toLowerCase().includes(q)) : PROVIDERS;
  }, [query]);

  return (
    <section className="pv-page">
      <div className="pv-head">
        <h1>Providers</h1>
        <button type="button" className="pv-close" aria-label="Close" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
      </div>

      <div className="pv-search">
        <input id="provider-search" type="text" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
        <label htmlFor="provider-search" aria-label="Search">
          <svg width="25" height="24" viewBox="0 0 25 24" fill="none" aria-hidden="true">
            <circle cx="10.670" cy="10.500" r="8.500" stroke="#fff" strokeWidth="2" />
            <path d="M13.490 7.180a4 4 0 0 0-5.650 0M16.780 16.610l4.240 4.250" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </label>
      </div>

      <div className="pv-grid">
        {list.map(([name, slug, logo]) => (
          <Link key={slug} to="/casino" title={name} aria-label={name} className="pv-tile">
            {logo ? <img src={logo} alt={name} loading="lazy" /> : <span className="pv-wordmark">{name}</span>}
          </Link>
        ))}
        {list.length === 0 ? <p className="pv-empty">No providers found.</p> : null}
      </div>
    </section>
  );
}
