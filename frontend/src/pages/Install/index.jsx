import { useEffect, useState } from 'react';
import { usePageContentReady } from '../../context/PageReadyContext';
import { site } from '../../config/site';
import {
  EVENT_INSTALLABLE,
  EVENT_INSTALLED,
  getDeferredInstallPrompt,
  openNativeInstall
} from '../../lib/pwaInstallPrompt';
import './install-page.css';

const PLATFORMS = [
  { id: 'android', label: 'For Android Installation' },
  { id: 'ios', label: 'For iOS Installation' },
  { id: 'desktop', label: 'For PC Installation' }
];

function androidSteps(host) {
  return [
    {
      title: `Open ${host} in the Chrome browser`,
      description: `Make sure you use the Chrome browser and open ${host}`,
      image: '/install/android-step-1.webp',
      width: 787,
      height: 387
    },
    {
      title: 'Tap the menu icon',
      description: 'Tap the three-dots menu icon in the top right corner',
      image: '/install/android-step-2.webp',
      width: 787,
      height: 387
    },
    {
      title: 'Install the app',
      description: 'Select "Install App" or "Add to Home Screen" from the menu',
      image: '/install/android-step-3.webp',
      width: 787,
      height: 387
    }
  ];
}

function iosSteps(host) {
  return [
    {
      title: `Open ${host} in the Safari browser`,
      description: `Make sure you use the Safari browser and open ${host}`,
      image: '/install/ios-step-1.webp',
      width: 650,
      height: 320
    },
    {
      title: 'Tap the Share button',
      description: 'Tap the share icon at the bottom of the screen',
      image: '/install/ios-step-2.webp',
      width: 787,
      height: 387
    },
    {
      title: 'Add to Home Screen',
      description: 'Scroll down and tap "Add to Home Screen", then tap "Add"',
      image: '/install/ios-step-3.webp',
      width: 650,
      height: 320
    }
  ];
}

function defaultPlatform() {
  if (typeof navigator === 'undefined') return 'android';
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'android';
}

function StepsPanel({ steps }) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const last = index >= steps.length - 1;
  return (
    <div className="gdi-stack">
      <div className="gdi-steps">
        {steps.map((s, i) => (
          <button
            key={s.image}
            type="button"
            className={`gdi-step-btn${i === index ? ' is-current' : ''}`}
            aria-current={i === index ? 'step' : undefined}
            onClick={() => setIndex(i)}
          >
            Step {i + 1}
          </button>
        ))}
      </div>
      <div className="gdi-stack">
        <div>
          <h2 className="gdi-step-title">{index + 1}. {step.title}</h2>
          <p className="gdi-step-desc">{step.description}</p>
        </div>
        <div className="gdi-shot gdi-shot--center">
          <img src={step.image} alt={step.title} width={step.width} height={step.height} loading="lazy" className="gdi-img" />
        </div>
        <div className="gdi-next-wrap">
          <button type="button" className="gdi-gold-btn gdi-next" disabled={last} onClick={() => setIndex((i) => i + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function DesktopPanel({ host }) {
  const [canInstall, setCanInstall] = useState(() => Boolean(getDeferredInstallPrompt()));
  useEffect(() => {
    const on = () => setCanInstall(Boolean(getDeferredInstallPrompt()));
    const off = () => setCanInstall(false);
    window.addEventListener(EVENT_INSTALLABLE, on);
    window.addEventListener(EVENT_INSTALLED, off);
    return () => {
      window.removeEventListener(EVENT_INSTALLABLE, on);
      window.removeEventListener(EVENT_INSTALLED, off);
    };
  }, []);
  return (
    <div className="gdi-stack">
      <div>
        <h2 className="gdi-step-title">1. Open {host} in the Chrome browser</h2>
        <p className="gdi-step-desc">Open {host} in Chrome and click the install button in the address bar.</p>
      </div>
      {canInstall ? (
        <div>
          <button type="button" className="gdi-gold-btn" onClick={() => openNativeInstall()}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V3" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /></svg>
            Install now
          </button>
        </div>
      ) : null}
      <div className="gdi-shot">
        <img src="/install/desktop-install.webp" alt={`Open ${host} in the Chrome browser`} width={787} height={387} loading="lazy" className="gdi-img gdi-img--full" />
      </div>
    </div>
  );
}

export function Install() {
  usePageContentReady(true);
  const host = typeof window !== 'undefined' && window.location.host ? window.location.host : site.platformName;
  const [tab, setTab] = useState(defaultPlatform);

  return (
    <section className="gdi">
      <header className="gdi-head">
        <h1 className="gdi-title">Install App</h1>
      </header>
      <div className="gdi-layout">
        <div className="gdi-tabs" role="tablist" aria-orientation="vertical">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={tab === p.id}
              className={`gdi-tab${tab === p.id ? ' is-selected' : ''}`}
              onClick={() => setTab(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="gdi-panel" role="tabpanel">
          {tab === 'android' && <StepsPanel key="android" steps={androidSteps(host)} />}
          {tab === 'ios' && <StepsPanel key="ios" steps={iosSteps(host)} />}
          {tab === 'desktop' && <DesktopPanel host={host} />}
        </div>
      </div>
    </section>
  );
}
