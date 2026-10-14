import { useCallback, useMemo } from 'react';
import { useLobbyContent } from './useLobbyContent';
import { isOff } from '../utils/lobbyText';

/**
 * Admin changes to the signed-in shell (sidebar + header), from the same lobby content:
 *   label('sidebar', 'promotions', 'Promotions') → the admin's label, else the built-in one
 *   hidden('sidebar', 'promotions')               → true when the admin switched the item off
 *   text('sidebar.balance', 'Your Balance')       → free text slot
 */
export function useLobbyShell() {
  const content = useLobbyContent();
  const t = content.text || {};
  const label = useCallback((group, id, fallback) => {
    const v = t[`${group}.${id}`];
    return typeof v === 'string' && v.trim() ? v : fallback;
  }, [t]);
  const hidden = useCallback((group, id) => isOff(content, `${group}:${id}`), [content]);
  const text = useCallback((path, fallback) => {
    const v = t[path];
    return typeof v === 'string' && v.trim() ? v : fallback;
  }, [t]);
  return useMemo(() => ({
    label,
    hidden,
    text,
    sidebarLinks: Array.isArray(content.sidebarLinks) ? content.sidebarLinks : [],
  }), [label, hidden, text, content.sidebarLinks]);
}
