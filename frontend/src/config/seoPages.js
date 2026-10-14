/**
 * Page-wise SEO copy from the DragonFury SEO audit.
 * Titles ~60 characters; descriptions ~155 characters.
 */
import { FEATURED_PLATFORM_GAMES } from './featuredPlatformGames';
import { getGameDisplayName } from '../utils/gameDisplay';

export const HOME_SEO = {
  title: 'Golden Dragon Casino - Access 20+ Sweepstakes Game Systems Online',
  description:
    'Dragon Fury, Orion Stars, Golden Dragon, Fire Kirin & more — all in one place. Explore our full games list and start playing today.',
};

export const GAMES_LISTING_SEO = {
  title: 'Our Games | Fish Tables & Slots - Golden Dragon Casino',
  description:
    'Browse every game system on Golden Dragon Casino — Juwa, Firekirin, Orionstars, Golden Dragon, Ultra Panda, Riversweeps, and more. Play in your browser today.',
};

export const BLOG_SEO = {
  title: 'Golden Dragon Casino Blog - Game Guides & Tips',
  description:
    'Explore guides, tips, and comparisons across every game system available on Golden Dragon Casino — from fish games to classic slots.',
};

export const FAQ_SEO = {
  title: 'Golden Dragon Casino FAQ | Sweepstakes Games Help',
  description:
    'Answers about free play, Sweepstakes Coins, redemption, eligibility, and support on Golden Dragon Casino. Play in your browser — no app download required.',
};

export const CONTACT_SEO = {
  title: 'Contact Golden Dragon Casino Support',
  description:
    'Reach Golden Dragon Casino customer support by email or live chat. Use official channels only, and never share your login details.',
};

function toSlug(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/2\.0/g, '2-0')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Unique copy keyed by homepage platform name. Image always comes from FEATURED_PLATFORM_GAMES. */
const PLATFORM_COPY = {
  'Golden Dragon': {
    genre: 'Fish & Slots',
    blurb: 'Classic fish tables and slots with a simple login and browser-based play.',
    title: 'Golden Dragon Sweepstakes Online | Golden Dragon Casino',
    description:
      'Play Golden Dragon fish games and slots on Golden Dragon Casino. No download — sign up and launch in your browser.',
  },
  'Ultra Panda': {
    genre: 'Fish & Slots',
    blurb: 'Ultra Panda fish shooting and slots, ready to play on desktop or mobile.',
    title: 'Ultra Panda Online | Golden Dragon Casino',
    description:
      'Access Ultra Panda fish games and slots through Golden Dragon Casino. Browser-based play with a wide table selection.',
  },
  Egame99: {
    genre: 'Casino & Slots',
    blurb: 'Egame99 casino-style games with fast browser access on Golden Dragon Casino.',
    title: 'Egame99 Online | Golden Dragon Casino',
    description:
      'Play Egame99 on Golden Dragon Casino in your browser. Sign up free and jump into the full game list — no app required.',
  },
  Vblink: {
    genre: 'Fish & Slots',
    blurb: 'Vblink fish games and slots with instant web play on Golden Dragon Casino.',
    title: 'Vblink Online | Golden Dragon Casino',
    description:
      'Launch Vblink fish games and slots on Golden Dragon Casino. No download needed — play from any modern browser.',
  },
  Juwa: {
    genre: 'Fish & Slots',
    blurb: 'Juwa fish games and slots — the flagship lineup, playable in your browser.',
    title: 'Dragon Fury Online - Fish Games & Slots | Golden Dragon Casino',
    description:
      'Access Juwa fish games and slots online through Golden Dragon Casino. No download needed — browser-based play with a wide game selection.',
  },
  Firekirin: {
    genre: 'Fish Games',
    blurb: 'Firekirin fish tables online — browse available rooms and start in your browser.',
    title: 'Firekirin Online - Fish Games | Golden Dragon Casino',
    description:
      "Play Firekirin fish games through Golden Dragon Casino's easy online access. Browse available tables and get started today.",
  },
  Orionstars: {
    genre: 'Fish & Slots',
    blurb: 'Orionstars fish games and slots with full library access in the browser.',
    title: 'Orionstars Online - Fish Games | Golden Dragon Casino',
    description:
      "Play Orionstars fish games and slots through Golden Dragon Casino's browser-based access. Explore the full game library today.",
  },
  CashMachine777: {
    genre: 'Slots',
    blurb: 'CashMachine777 slots with one-click browser play on Golden Dragon Casino.',
    title: 'CashMachine777 Slots Online | Golden Dragon Casino',
    description:
      'Play CashMachine777 slots on Golden Dragon Casino. Sign up, open the platform in your browser, and start spinning — no app download.',
  },
  Gameroom: {
    genre: 'Casino',
    blurb: 'Gameroom casino titles with simple web login on Golden Dragon Casino.',
    title: 'Gameroom Online | Golden Dragon Casino',
    description:
      'Access Gameroom casino games through Golden Dragon Casino. Browser-based play, wide selection, no download required.',
  },
  Mafia: {
    genre: 'Fish & Slots',
    blurb: 'Mafia fish games and slots with browser-based play on Golden Dragon Casino.',
    title: 'Mafia Online | Golden Dragon Casino',
    description:
      'Play Mafia fish games and slots on Golden Dragon Casino. Sign up and launch in your browser — no download required.',
  },
  Gamevault: {
    genre: 'Fish & Slots',
    blurb: 'Game Vault fish games and slots, launched straight from Golden Dragon Casino.',
    title: 'Game Vault Online | Golden Dragon Casino',
    description:
      'Play Game Vault fish games and slots on Golden Dragon Casino. Instant browser access with a wide table and slot list.',
  },
  'Juwa 2.0': {
    genre: 'Fish & Slots',
    blurb: 'Juwa 2.0 — the next Juwa lineup, playable in your browser on Golden Dragon Casino.',
    title: 'Juwa 2.0 Online | Golden Dragon Casino',
    description:
      'Access Juwa 2.0 fish games and slots through Golden Dragon Casino. No download — sign up and play in your browser.',
  },
  Milkyway: {
    genre: 'Fish & Slots',
    blurb: 'Milkyway fish shooting and slots with instant web play.',
    title: 'Milkyway Online | Golden Dragon Casino',
    description:
      'Launch Milkyway fish games and slots on Golden Dragon Casino. Browser-based access, no app required.',
  },
  Pandamasters: {
    genre: 'Fish & Slots',
    blurb: 'Pandamasters fish tables and slots, ready on desktop or phone.',
    title: 'Pandamasters Online | Golden Dragon Casino',
    description:
      'Play Pandamasters fish games and slots through Golden Dragon Casino. Sign up and play in your browser today.',
  },
  Riversweeps: {
    genre: 'Fish & Slots',
    blurb: 'Riversweeps fish games and slots with one login on Golden Dragon Casino.',
    title: 'Riversweeps Online | Golden Dragon Casino',
    description:
      'Access Riversweeps fish games and slots on Golden Dragon Casino. No download needed — play in any modern browser.',
  },
  Vegasx: {
    genre: 'Casino & Slots',
    blurb: 'Vegasx casino and slots with fast browser play on Golden Dragon Casino.',
    title: 'Vegasx Online | Golden Dragon Casino',
    description:
      'Play Vegasx casino games and slots on Golden Dragon Casino. Simple login, browser-based play, no app download.',
  },
};

export const GAME_CATEGORY_PAGES = FEATURED_PLATFORM_GAMES.map((featured) => {
  const displayName = getGameDisplayName(featured.name) || featured.name;
  const copy = PLATFORM_COPY[featured.name] || PLATFORM_COPY[displayName] || {};
  const slug = toSlug(featured.name);
  return {
    slug,
    name: displayName,
    catalogName: featured.name,
    title: copy.title || `${displayName} Online | Golden Dragon Casino`,
    description:
      copy.description ||
      `Play ${displayName} on Golden Dragon Casino in your browser. Sign up free — no download required.`,
    blurb: copy.blurb || `Play ${displayName} online in your browser on Golden Dragon Casino.`,
    genre: copy.genre || 'Sweepstakes',
    image: featured.image_url,
  };
});

/** ItemList schema: real catalog games, same order as the homepage grid. */
export const GAME_CATEGORY_ITEMLIST_SLUGS = GAME_CATEGORY_PAGES.map((page) => page.slug);

/** Old SEO-audit URLs that should land on the matching real game. */
export const GAME_CATEGORY_ALIASES = {
  'fire-kirin': 'firekirin',
  'orion-stars': 'orionstars',
  'game-vault': 'gamevault',
  'river-sweeps': 'riversweeps',
  'panda-masters': 'pandamasters',
  'ultra-panda': 'ultra-panda',
  'golden-dragon': 'golden-dragon',
  'juwa-2.0': 'juwa-2-0',
};

/** Fake / unmatched slugs from the audit — send back to the real catalog. */
export const GAME_CATEGORY_REDIRECTS = {
  'fish-game': '/games',
  grandsweeps: '/games',
};

const CATEGORY_BY_SLUG = new Map(GAME_CATEGORY_PAGES.map((page) => [page.slug, page]));

export function resolveGameCategorySlug(raw) {
  const slug = String(raw || '').trim().toLowerCase();
  if (!slug) return '';
  if (GAME_CATEGORY_REDIRECTS[slug]) return slug;
  return GAME_CATEGORY_ALIASES[slug] || slug;
}

export function getGameCategoryBySlug(raw) {
  const slug = resolveGameCategorySlug(raw);
  return CATEGORY_BY_SLUG.get(slug) || null;
}

export function getGameCategoryRedirect(raw) {
  const slug = String(raw || '').trim().toLowerCase();
  return GAME_CATEGORY_REDIRECTS[slug] || null;
}

/** Canonical path for a /games/:slug URL (aliases collapse to the real slug). */
export function getGameCategoryCanonicalPath(raw) {
  const redirect = getGameCategoryRedirect(raw);
  if (redirect) return redirect;
  const page = getGameCategoryBySlug(raw);
  if (page) return `/games/${page.slug}`;
  return null;
}

export function isGameCategorySlug(raw) {
  const slug = resolveGameCategorySlug(raw);
  return CATEGORY_BY_SLUG.has(slug);
}

export const ROUTE_SEO = {
  '/': HOME_SEO,
  '/games': GAMES_LISTING_SEO,
  '/blog': BLOG_SEO,
  '/faq': FAQ_SEO,
  '/contact': CONTACT_SEO,
};

export function getRouteSeo(pathname) {
  const path = pathname || '/';
  if (ROUTE_SEO[path]) return ROUTE_SEO[path];
  if (path.startsWith('/games/')) {
    const slug = path.slice('/games/'.length).split('/')[0];
    const category = getGameCategoryBySlug(slug);
    if (category) {
      return { title: category.title, description: category.description };
    }
  }
  return null;
}
