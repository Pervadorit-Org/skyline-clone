import { Link, useLocation } from 'react-router-dom';
import './why-play-how-to-play.css';

const STEPS = [
  {
    n: 1,
    title: 'Sign Up & Claim',
    body: 'Create your free account in seconds and claim your welcome bonus instantly.',
  },
  {
    n: 2,
    title: 'Play Slots, Fish & More',
    body: 'Use Gold Coins to play for fun, or Sweeps Coins for a real-cash-prize shot.',
  },
  {
    n: 3,
    title: 'Redeem Instantly',
    body: 'Cash out your Sweeps Coin winnings fast — straight to your bank, card or gift card.',
  },
];

export function HowToPlaySection() {
  const { search } = useLocation();
  const signupTo = `/register${search || ''}`;

  return (
    <section className="df-how-to-play" aria-labelledby="df-htp-title">
      <div className="df-how-to-play-copy">
        <h2 className="df-htp-title" id="df-htp-title">
          How to play in <span>3 easy steps</span>
        </h2>
        <ol className="df-htp-steps">
          {STEPS.map((s) => (
            <li key={s.n} className="df-htp-step">
              <span className="df-htp-step-num" aria-hidden>
                {s.n}
              </span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="df-htp-cta-card">
        <p className="df-htp-cta-kicker">Sign Up &amp; Get</p>
        <ul className="df-htp-cta-list">
          <li>
            <span className="df-htp-cta-amount">15,000</span>
            <span className="df-htp-cta-unit">GC</span>
          </li>
          <li>
            <span className="df-htp-cta-amount df-htp-cta-amount--sc">0.5</span>
            <span className="df-htp-cta-unit">SC</span>
          </li>
          <li className="df-htp-cta-bonus">+100% Bonus <span>on 1st purchase</span></li>
        </ul>
        <Link to={signupTo} className="df-htp-cta-btn">
          Claim Now
        </Link>
      </div>
    </section>
  );
}
