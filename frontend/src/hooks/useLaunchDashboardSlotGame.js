import { useCallback, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getSlotLaunchMode } from '../config/slotLaunch';
import * as onegamehubApi from '../api/onegamehub';
import * as bonaApi from '../api/bona';
import { resolveLaunchGameId, isOneGameHubFishingPlayGame } from '../utils/slotLobbyGames';
import { useDepositRequiredGate } from './useDepositRequiredGate';
import { isDepositRequiredError } from '../utils/depositRequired';

/**
 * Launch a dashboard/catalog slot game (home cross-sell, lobby carousels, etc.).
 */
export function useLaunchDashboardSlotGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const {
    requireDeposit,
    openDepositRequiredModal,
    depositRequiredModalOpen,
    closeDepositRequiredModal,
    activationBonusType,
  } = useDepositRequiredGate();
  const [launchingGameId, setLaunchingGameId] = useState(null);
  const launchLoadingRef = useRef(false);

  const handlePlayGame = useCallback(
    async (game) => {
      if (!isAuthenticated) {
        navigate('/register', { state: { from: location.pathname } });
        return;
      }

      const gameid = resolveLaunchGameId(game);
      if (!gameid || launchLoadingRef.current) {
        if (!gameid) {
          toast.error('This game cannot be launched right now. Please try another title.');
        }
        return;
      }

      requireDeposit(async () => {
        launchLoadingRef.current = true;
        setLaunchingGameId(gameid);

        try {
          const provider = game.provider || '';

          if (provider === 'bona') {
            if (getSlotLaunchMode() === 'tab') {
              const res = await bonaApi.launchBonaGame(gameid);
              const url = res?.url ? String(res.url).trim() : '';
              if (!url) throw new Error('Game launch URL not returned');
              window.open(url, '_blank', 'noopener,noreferrer');
              return;
            }

            navigate(`/play/${encodeURIComponent(gameid)}`, {
              state: {
                provider: 'bona',
                name: game.title || 'Bona game',
                returnTo: location.pathname,
                image: game.image || '',
                iconUrls: game.iconUrls || [],
                symbol: game.symbol || '',
                gameType: game.gameType || null,
              },
            });
            return;
          }

          if (provider === 'onegamehub' || provider === '1gamehub') {
            const isFishing = isOneGameHubFishingPlayGame({
              ...game,
              provider,
              gameid,
            });
            if (getSlotLaunchMode() === 'tab') {
              const res = await onegamehubApi.launchOneGameHubGame(gameid);
              const url = res?.url ? String(res.url).trim() : '';
              if (!url) throw new Error('Game launch URL not returned');
              window.open(url, '_blank', 'noopener,noreferrer');
              return;
            }

            navigate(
              `/play/${encodeURIComponent(gameid)}?provider=onegamehub${isFishing ? '&fishing=1' : ''}`,
              {
              state: {
                provider: 'onegamehub',
                name: game.title || '1GameHub game',
                returnTo: location.pathname,
                image: game.image || '',
                iconUrls: game.iconUrls || [],
                symbol: game.symbol || '',
                categories: game.categories || [],
                isFishing,
              },
            });
            return;
          }

          throw new Error('This game cannot be launched right now. Please try another title.');
        } catch (e) {
          if (isDepositRequiredError(e)) {
            openDepositRequiredModal();
          } else {
            toast.error(e.message || 'Unable to launch this game. Please try again.');
          }
        } finally {
          launchLoadingRef.current = false;
          setLaunchingGameId(null);
        }
      });
    },
    [
      isAuthenticated,
      location.pathname,
      navigate,
      openDepositRequiredModal,
      requireDeposit,
      toast,
    ]
  );

  return {
    handlePlayGame,
    launchingGameId,
    depositRequiredModalOpen,
    closeDepositRequiredModal,
    activationBonusType,
  };
}
