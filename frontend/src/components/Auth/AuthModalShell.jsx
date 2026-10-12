import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import './auth-dragonfury.css';
import './auth-modal-v2.css';

/** Single-column login / signup modal (dark card, gold title, centered content). */
export function AuthModalShell({ title, children }) {
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('df-auth-overlay-open');
    const onKey = (e) => e.key === 'Escape' && navigate('/');
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('df-auth-overlay-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [navigate]);

  const close = () => navigate('/');

  return createPortal(
    <div className="am2-root">
      <button type="button" className="am2-backdrop" aria-label="Close" onClick={close} />
      <section className="am2-card" role="dialog" aria-modal="true" aria-labelledby="am2-title">
        <button type="button" className="am2-close" onClick={close} aria-label="Close">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
        <h2 id="am2-title" className="am2-title">{title}</h2>
        {children}
      </section>
    </div>,
    document.body
  );
}
