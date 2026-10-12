import { useState, useEffect, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { scrollToGamesSection } from '../../utils/scrollToGames';
import { useAuth } from '../../context/AuthContext';
import * as welcomeSignupBonusApi from '../../api/welcomeSignupBonus';
import '../../styles/spinzy-layout.css';
import { AppLoader } from '../../components/AppLoader';
import { HomeV2 } from '../../components/Home/Home2/HomeV2';
import { WelcomeBonusModal } from '../../components/Home/WelcomeBonusModal';
import { useWelcomeBonusScrollModal } from '../../hooks/useWelcomeBonusScrollModal';
import { useWelcomeBonusImagePreload } from '../../hooks/useWelcomeBonusImagePreload';
import { useGuestLandingScrollCount } from '../../hooks/useGuestLandingScrollCount';
import { site } from '../../config/site';
import { usePageContentReady } from '../../context/PageReadyContext';

const LandingFooter = lazy(() =>
  import('../../components/LandingFooter').then((m) => ({ default: m.LandingFooter }))
);

const CasinoLobby = lazy(() =>
  import('../../components/Casino/CasinoLobby').then((m) => ({ default: m.CasinoLobby }))
);

function GamesLoading() {
  return <AppLoader fillPage={false} message="Loading games" />;
}

export function Home() {
  const { isAuthenticated, loading } = useAuth();
  const { hash } = useLocation();
  usePageContentReady(true);
  // While the initial auth check is in-flight (e.g. on refresh), `isAuthenticated`
  // is momentarily false. Guard guest-only landing sections behind the resolved
  // state so logged-in users don't see a flash of landing content.
  const showGuestSections = !loading && !isAuthenticated;
  // Start counting guest scroll gestures immediately (1st = welcome, 3rd = spin).
  useGuestLandingScrollCount(showGuestSections);
  const [welcomeModalImageSrc, setWelcomeModalImageSrc] = useState(null);
  const [welcomeConfigReady, setWelcomeConfigReady] = useState(!showGuestSections);
  const welcomeModalEnabled = showGuestSections && Boolean(welcomeModalImageSrc);
  const welcomeBonusImageReady = useWelcomeBonusImagePreload(
    welcomeModalEnabled,
    welcomeModalImageSrc
  );
  const { open: welcomeModalOpen, onClose: closeWelcomeModal } = useWelcomeBonusScrollModal({
    guestReady: showGuestSections,
    configReady: welcomeConfigReady,
    hasImage: Boolean(welcomeModalImageSrc),
    imageReady: welcomeBonusImageReady,
  });
  const [activeView, setActiveView] = useState('games');
  const [belowFoldReady, setBelowFoldReady] = useState(
    () => typeof document !== 'undefined' && document.readyState === 'complete'
  );

  useEffect(() => {
    if (belowFoldReady) return undefined;
    const ready = () => setBelowFoldReady(true);
    if (document.readyState === 'complete') {
      ready();
      return undefined;
    }
    window.addEventListener('load', ready, { once: true });
    const timeoutId = window.setTimeout(ready, 600);
    return () => {
      window.removeEventListener('load', ready);
      window.clearTimeout(timeoutId);
    };
  }, [belowFoldReady]);

  useEffect(() => {
    if (!showGuestSections) {
      setWelcomeModalImageSrc(null);
      setWelcomeConfigReady(true);
      return undefined;
    }
    setWelcomeConfigReady(false);
    let cancelled = false;
    welcomeSignupBonusApi
      .getWelcomeSignupBonusPublic()
      .then((res) => {
        if (cancelled) return;
        const url = typeof res?.modalImageUrl === 'string' ? res.modalImageUrl.trim() : '';
        setWelcomeModalImageSrc(url || null);
      })
      .catch(() => {
        if (!cancelled) setWelcomeModalImageSrc(null);
      })
      .finally(() => {
        if (!cancelled) setWelcomeConfigReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [showGuestSections]);

  useEffect(() => {
    if (hash !== '#games') return;
    setActiveView('games');
    scrollToGamesSection();
  }, [hash]);

  return (
    <div className="dashboard dash-page dash-page--fury">
      {welcomeModalEnabled && (
        <WelcomeBonusModal
          open={welcomeModalOpen}
          onClose={closeWelcomeModal}
          imageReady={welcomeBonusImageReady}
          imageSrc={welcomeModalImageSrc}
        />
      )}

      <div className="dash-layout">
        <div className="dash-main">
          {showGuestSections ? (
            <>
              <h1 className="dash-home-h1 sr-only">{site.seoTitle || site.platformName}</h1>
              <HomeV2 revealBelowFold={belowFoldReady} />
            </>
          ) : isAuthenticated ? (
            <>
              <h1 className="dash-home-h1 sr-only">{site.seoTitle || site.platformName}</h1>
              <Suspense fallback={<GamesLoading />}>
                <CasinoLobby />
              </Suspense>
            </>
          ) : (
            <GamesLoading />
          )}

          {belowFoldReady ? (
            <Suspense fallback={null}>
              <LandingFooter />
            </Suspense>
          ) : null}
        </div>
      </div>
    </div>
  );
}
