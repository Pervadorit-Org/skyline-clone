import { lazy, Suspense, useCallback, useState } from 'react';

const GuestSlotSpinWheelModal = lazy(() =>
  import('./SpinWheel/GuestSlotSpinWheelModal').then((m) => ({ default: m.GuestSlotSpinWheelModal }))
);

/**
 * Guest home — spin card matching DragonFury.online landing treatment.
 */
export function SpinWinSection() {
  const [spinModalOpen, setSpinModalOpen] = useState(false);
  const [spinLoaded, setSpinLoaded] = useState(false);

  const openSpinModal = useCallback(() => {
    setSpinLoaded(true);
    setSpinModalOpen(true);
  }, []);

  return (
    <section id="spin" className="dash-spin-duo-section dash-animate-in spz-spin" aria-label="Spin and win">
      <div className="dash-spin-duo">
        <div className="dash-spin-card spz-spin-card">
          <div className="spz-spin-inner">
            <div className="spz-spin-copy">
              <p className="spz-spin-kick">Spin &amp; Win</p>
              <h2 className="spz-spin-title">Spin the wheel</h2>
              <p className="spz-spin-desc">
                Register and claim eligible rewards shown before you spin.
              </p>
              <ol className="spz-spin-steps" aria-label="How the spin works">
                <li>
                  <span className="spz-spin-step-num" aria-hidden="true">1</span>
                  <span><b>Register</b><small>Create your free account</small></span>
                </li>
                <li>
                  <span className="spz-spin-step-num" aria-hidden="true">2</span>
                  <span><b>Spin</b><small>See eligible rewards first</small></span>
                </li>
                <li>
                  <span className="spz-spin-step-num" aria-hidden="true">3</span>
                  <span><b>Claim</b><small>Rewards land in your account</small></span>
                </li>
              </ol>
              <div className="spz-spin-actions">
                <button type="button" className="spz-btn spz-btn--gold" onClick={openSpinModal}>
                  Spin now
                </button>
                <ul className="spz-spin-tags" aria-label="Highlights">
                  <li>Free to join</li>
                  <li>Daily spin</li>
                  <li>Rewards shown first</li>
                </ul>
              </div>
            </div>

            <div className="spz-spin-stage">
            <button
              type="button"
              className="spz-wheel"
              onClick={openSpinModal}
              aria-label="Open spin wheel"
            >
              <svg viewBox="0 0 200 200" width="260" height="260" aria-hidden="true">
                <defs>
                  <linearGradient id="spzGold" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#ffe58a" />
                    <stop offset="1" stopColor="#f0b92e" />
                  </linearGradient>
                </defs>
                {/* pointer */}
                <path d="M100 6 L110 26 L90 26 Z" fill="url(#spzGold)" />
                {/* rim */}
                <circle cx="100" cy="100" r="86" fill="none" stroke="url(#spzGold)" strokeWidth="6" />
                {/* 8 flat segments */}
                {Array.from({ length: 8 }).map((_, i) => {
                  const a0 = (i * 45 - 90) * (Math.PI / 180);
                  const a1 = ((i + 1) * 45 - 90) * (Math.PI / 180);
                  const r = 80;
                  const x0 = 100 + r * Math.cos(a0);
                  const y0 = 100 + r * Math.sin(a0);
                  const x1 = 100 + r * Math.cos(a1);
                  const y1 = 100 + r * Math.sin(a1);
                  const fills = ['#3b2845', '#52375e'];
                  const labels = ['GC', 'SC', 'BONUS', 'VIP', 'GC', 'SC', 'BONUS', 'VIP'];
                  const mid = ((i + 0.5) * 45 - 90) * (Math.PI / 180);
                  const lx = 100 + 56 * Math.cos(mid);
                  const ly = 100 + 56 * Math.sin(mid);
                  return (
                    <g key={i}>
                      <path
                        d={`M100 100 L${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1} Z`}
                        fill={i % 2 ? fills[1] : fills[0]}
                      />
                      <text
                        x={lx}
                        y={ly}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="9"
                        fontWeight="800"
                        fill="#ffe58a"
                        fontFamily="Inter, sans-serif"
                        transform={`rotate(${(i + 0.5) * 45} ${lx} ${ly})`}
                      >
                        {labels[i]}
                      </text>
                    </g>
                  );
                })}
                {/* hub */}
                <circle cx="100" cy="100" r="30" fill="#1e0a22" stroke="url(#spzGold)" strokeWidth="3" />
                <text
                  x="100"
                  y="105"
                  textAnchor="middle"
                  fontSize="18"
                  fontWeight="800"
                  fill="#ffe58a"
                  fontFamily="Inter, sans-serif"
                >
                  SPIN
                </text>
              </svg>
            </button>
            </div>
          </div>
        </div>
      </div>

      {spinLoaded ? (
        <Suspense fallback={null}>
          <GuestSlotSpinWheelModal open={spinModalOpen} onClose={() => setSpinModalOpen(false)} />
        </Suspense>
      ) : null}
    </section>
  );
}
