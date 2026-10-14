import { site } from '../../config/site';
import './why-play-how-to-play.css';

const FEATURES = [
  {
    icon: '⚡',
    title: 'Fast & Secure Redemptions',
    text: 'Quick, safe, hassle-free redemptions through trusted payment providers — processed reliably every time.',
  },
  {
    icon: '🎧',
    title: '24/7 Support',
    text: 'Our support team is available around the clock. If you ever need help, we’re just a message away.',
  },
  {
    icon: '🔒',
    title: 'Privacy & Security',
    text: 'Your data matters. We use strong security measures to keep your account safe at all times.',
  },
  {
    icon: '👑',
    title: 'VIP Perks & Rewards',
    text: 'Unlock exclusive bonuses, perks and priority benefits as you play — more value, every level up.',
  },
];

export function WhyPlaySection() {
  return (
    <section className="df-why-play" aria-labelledby="df-why-play-title">
      <p className="df-games-eyebrow">The {site.platformName} difference</p>
      <h2 className="df-games-title df-why-play-title" id="df-why-play-title">
        Why play at {site.platformName}?
      </h2>
      <p className="df-games-sub">
        Dive into a world of social casino games designed for nonstop entertainment — built so you
        can focus on playing, anytime, anywhere.
      </p>
      <div className="df-why-play-grid">
        {FEATURES.map((f) => (
          <div className="df-why-play-card" key={f.title}>
            <span className="df-why-play-icon" aria-hidden>
              {f.icon}
            </span>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
