import { useMemo } from 'react';
import { casinoLobbyConfig } from '../config/casinoLobbyConfig';
import { useLobbyContent } from './useLobbyContent';
import { applyLobbyText, isOff } from '../utils/lobbyText';

/**
 * The lobby presentation config (casinoLobbyConfig) with the admin's changes applied:
 * edited text / links, switched-off promo cards and category pills, and the provider logo list.
 */
export function useLobbyConfig() {
  const content = useLobbyContent();
  return useMemo(() => {
    const cfg = applyLobbyText(casinoLobbyConfig, content.text);
    const providerLogos = Array.isArray(content.providers) && content.providers.length ? content.providers : null;
    return {
      ...cfg,
      promoCards: cfg.promoCards.filter((c) => !isOff(content, `card:${c.id}`)),
      categories: cfg.categories.filter((c) => !isOff(content, `tab:${c.id || 'home'}`)),
      providers: providerLogos ? { ...cfg.providers, logos: providerLogos } : cfg.providers,
      off: (key) => isOff(content, key),
    };
  }, [content]);
}
