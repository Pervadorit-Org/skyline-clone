/**
 * Game categories shown on /category/:slug (strip order = display order).
 * `catalogId` is the id the provider catalog buckets games under, which
 * differs from the public slug for a few categories (e.g. Live Dealer).
 */
export const GAME_CATEGORIES = [
  { slug: 'bingo', label: 'Bingo', catalogId: 'bingo', icon: '/df-online/club-icons/bingo.svg' },
  { slug: 'crash-game', label: 'Crash Game', catalogId: 'crash-game', icon: '/df-online/club-icons/crash.svg' },
  { slug: 'fishing', label: 'Fishing', catalogId: 'fishing', icon: '/df-online/club-icons/fish.svg' },
  { slug: 'instant-win', label: 'Instant Win', catalogId: 'instant-win', icon: '/df-online/club-icons/instant.svg' },
  { slug: 'keno', label: 'Keno', catalogId: 'keno', icon: '/df-online/club-icons/keno.svg' },
  { slug: 'live-dealer', label: 'Live Dealer', catalogId: 'live-casino', icon: '/df-online/club-icons/dice.svg' },
  { slug: 'lottery', label: 'Lottery', catalogId: 'lottery', icon: '/df-online/club-icons/lottery.svg' },
  { slug: 'scratch-cards', label: 'Scratch Cards', catalogId: 'scratch-cards', icon: '/df-online/club-icons/scratch.svg' },
  { slug: 'shooting', label: 'Shooting', catalogId: 'shooting', icon: '/df-online/club-icons/shooting.svg' },
  { slug: 'slots', label: 'Slots', catalogId: 'slots', icon: '/df-online/club-icons/slots-777.svg' },
  { slug: 'table-games', label: 'Table Games', catalogId: 'table-games', icon: '/df-online/club-icons/cards.svg' },
  { slug: 'virtual-game', label: 'Virtual Game', catalogId: 'virtual-games', icon: '/df-online/club-icons/virtual.svg' },
];

/** Catalog / legacy ids that should land on a category page slug. */
const LEGACY_ALIASES = {
  'live-casino': 'live-dealer',
  live: 'live-dealer',
  livecasino: 'live-dealer',
  virtual: 'virtual-game',
  'virtual-games': 'virtual-game',
  virtualgames: 'virtual-game',
  slot: 'slots',
  table: 'table-games',
  crash: 'crash-game',
  instant: 'instant-win',
  scratch: 'scratch-cards',
};

export function getGameCategory(slugOrId) {
  const raw = String(slugOrId || '').trim().toLowerCase();
  const slug = LEGACY_ALIASES[raw] || raw;
  return GAME_CATEGORIES.find((c) => c.slug === slug) || null;
}

/** Public URL for a category (accepts a slug or a legacy catalog id). */
export function getGameCategoryPath(slugOrId) {
  const category = getGameCategory(slugOrId);
  return category ? `/category/${category.slug}` : '/casino';
}
