/**
 * Admin text overrides for the lobby / sidebar / header (Admin → Pages → Lobby), stored in
 * `lobby_content.text` as { "promoCards.0.title": "…" } — dotted paths into the built-in config.
 */

const BAD = new Set(['__proto__', 'constructor', 'prototype']);

/** A copy of `base` with every override applied. Only replaces values that already exist. */
export function applyLobbyText(base, text) {
  const keys = text && typeof text === 'object' ? Object.keys(text) : [];
  if (!keys.length) return base;
  const out = typeof structuredClone === 'function' ? structuredClone(base) : JSON.parse(JSON.stringify(base));
  for (const key of keys) {
    const value = text[key];
    if (typeof value !== 'string' || !value.trim()) continue;
    const parts = key.split('.');
    if (parts.some((p) => BAD.has(p))) continue;
    let node = out;
    for (let i = 0; i < parts.length - 1 && node != null; i += 1) node = node[parts[i]];
    const last = parts[parts.length - 1];
    if (node != null && typeof node === 'object' && last in node && typeof node[last] === 'string') {
      node[last] = value;
    }
  }
  return out;
}

export const isOff = (content, key) => Array.isArray(content?.off) && content.off.includes(key);
