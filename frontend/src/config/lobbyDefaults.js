/**
 * Default layout of the signed-in lobby (the rows under the banners), in display order.
 * Every row is filled from the live game list (provider catalog); this file only says which rows exist,
 * in what shape, and where their games come from. Admin → Pages → Lobby overrides the order, titles,
 * counts, picks and on/off per row (settings key `lobby_content`).
 *
 * type    featured | rows | mosaic | grid | rank   (the existing lobby row styles)
 * source  { kind: 'category', catalogId }  games of one category
 *         { kind: 'brand', index }          games of the Nth biggest studio
 *         { kind: 'all', offset }           a window of the whole catalog
 *         { kind: 'new' }                   newest games
 *         { kind: 'top' }                   first games of the catalog
 *         { kind: 'keyword', words, offset } titles / tags containing a word, then a window of the catalog
 * popular  (number) rank the row by real play history, starting at that rank (0 = most played). Used by the
 *          Top 10 / Trending / Top Games rows when the play ranking is available.
 */
import { GAME_CATEGORIES, getGameCategory } from './gameCategories';
import { LOBBY_ICON_FISH, LOBBY_ICON_SPARKLE } from './lobbyIcons';

const cat = (slug, lines = 1) => {
  const c = getGameCategory(slug);
  return {
    id: `cat-${c.slug}`,
    type: 'rows',
    title: c.label,
    icon: c.icon,
    categoryIcon: true,
    viewAll: `/category/${c.slug}`,
    source: { kind: 'category', catalogId: c.catalogId },
    lines,
    perLine: 12,
  };
};

const mosaic = (id, title, pattern, source, count) => ({
  id, type: 'mosaic', title, icon: LOBBY_ICON_SPARKLE, pattern, source, count,
});

export const LOBBY_DEFAULT_SECTIONS = [
  { id: 'feat-1', type: 'featured', title: 'Featured', source: { kind: 'brand', index: 0 }, count: 21 },
  cat('bingo'),
  mosaic('mosaic-picks', "Editor's Picks", 'b', { kind: 'all', offset: 0 }, 25),
  cat('crash-game'),
  { id: 'feat-2', type: 'featured', title: 'Featured', source: { kind: 'brand', index: 1 }, count: 18 },
  mosaic('after-dark', 'After Dark', 'b', { kind: 'all', offset: 140 }, 32),
  cat('fishing', 3),
  { id: 'top10', type: 'rank', title: 'Top 10 Games', icon: LOBBY_ICON_SPARKLE, source: { kind: 'top' }, count: 10, popular: 0 },
  mosaic('jackpot', 'Jackpot Zone', 'a', { kind: 'keyword', words: ['jackpot'], offset: 110 }, 29),
  cat('instant-win'),
  { id: 'feat-3', type: 'featured', title: 'Featured', source: { kind: 'brand', index: 2 }, count: 25 },
  { ...mosaic('trending', 'Trending Games', 'a', { kind: 'all', offset: 55 }, 18), popular: 10 },
  cat('keno'),
  cat('live-dealer'),
  cat('lottery'),
  { ...mosaic('top-games', 'Top Games', 'a', { kind: 'all', offset: 75 }, 32), popular: 28 },
  { id: 'new', type: 'grid', title: 'New Games', icon: LOBBY_ICON_SPARKLE, source: { kind: 'new' }, count: 20 },
  cat('scratch-cards'),
  mosaic('mosaic-arcade', 'Arcade', 'a', { kind: 'all', offset: 25 }, 30),
  {
    id: 'top10-fishing', type: 'rank', title: 'Top 10 Fish Games', icon: LOBBY_ICON_FISH,
    source: { kind: 'category', catalogId: 'fishing' }, count: 10, popular: 0,
  },
  cat('shooting'),
  cat('slots', 3),
  mosaic('jokes', 'Jokes', 'a', { kind: 'keyword', words: ['joker'], offset: 175 }, 20),
  { id: 'feat-4', type: 'featured', title: 'Featured', source: { kind: 'brand', index: 3 }, count: 20 },
  cat('table-games'),
];

/** Row ids after which the lobby shows its extra panels (packages, invite/deals, exclusive banner). */
export const LOBBY_INSERT_AFTER = {
  'feat-3': ['packages'],
  'cat-shooting': ['inviteDeals', 'exclusive'],
};

/** Our own background art for the featured (studio) rows, used when the admin has not set one. */
export const LOBBY_FEATURED_ART = [
  '/partners/bgaming.webp',
  '/partners/cq9_gaming.webp',
  '/partners/egt_digital.webp',
  '/partners/playsoon.webp',
  '/partners/rubyplay.webp',
];

export { GAME_CATEGORIES };
