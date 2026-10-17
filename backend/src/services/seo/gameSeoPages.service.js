'use strict';

const { schemaForGamePage, PLAYJUWA_ORIGIN } = require('./pageSchema.service');

const STORE = 'dragonfury';
const PLAYJUWA = 'playjuwa';
const GOLDENDRAGON = 'goldendragon';
const GAME_STORES = new Set([STORE, PLAYJUWA, GOLDENDRAGON]);

/** Static platform catalog shown on /games and /platform-games/:slug (no database table). */
const CATALOG = [
  game('golden-dragon', 'Golden Dragon', 'Fish & Slots', '/optimized/games/goldendragon.webp', 'Golden Dragon Sweepstakes Online | Dragon Fury', 'Play Golden Dragon fish games and slots on Dragon Fury. No download — sign up and launch in your browser.', 'Classic fish tables and slots with a simple login and browser-based play.'),
  game('ultra-panda', 'Ultra Panda', 'Fish & Slots', '/optimized/games/ultrapanda.webp', 'Ultra Panda Online | Dragon Fury', 'Access Ultra Panda fish games and slots through Dragon Fury. Browser-based play with a wide table selection.', 'Ultra Panda fish shooting and slots, ready to play on desktop or mobile.'),
  game('egame99', 'Egame99', 'Casino & Slots', '/optimized/games/egame99.webp', 'Egame99 Online | Dragon Fury', 'Play Egame99 on Dragon Fury in your browser. Sign up free and jump into the full game list — no app required.', 'Egame99 casino-style games with fast browser access on Dragon Fury.'),
  game('vblink', 'Vblink', 'Fish & Slots', '/optimized/games/vblink.webp', 'Vblink Online | Dragon Fury', 'Launch Vblink fish games and slots on Dragon Fury. No download needed — play from any modern browser.', 'Vblink fish games and slots with instant web play on Dragon Fury.'),
  game('ultra-thunder', 'Ultra Thunder', 'Sweepstakes', '/optimized/games/ultathunder.webp', 'Ultra Thunder Online | Dragon Fury', 'Play Ultra Thunder on Dragon Fury in your browser. Sign up free — no download required.', 'Play Ultra Thunder online in your browser on Dragon Fury.'),
  game('estar', 'Estar', 'Sweepstakes', '/optimized/games/estar.webp', 'Estar Online | Dragon Fury', 'Play Estar on Dragon Fury in your browser. Sign up free — no download required.', 'Play Estar online in your browser on Dragon Fury.'),
  game('dragon-fury', 'Dragon Fury', 'Sweepstakes', '/optimized/games/dragonfury.webp', 'Dragon Fury Sweepstakes Online', 'Play Dragon Fury fish games and slots in your browser. Sign up free — no download required.', 'Classic Dragon Fury play with a simple login in your browser.'),
  game('juwa', 'Juwa', 'Fish & Slots', '/optimized/games/juwa.webp', 'Play Juwa Online - Fish Games & Slots | Dragon Fury', 'Access Juwa fish games and slots online through Dragon Fury. No download needed — browser-based play with a wide game selection.', 'Juwa fish games and slots — the flagship lineup, playable in your browser.'),
  game('firekirin', 'Firekirin', 'Fish Games', '/optimized/games/firekirin.webp', 'Firekirin Online - Fish Games | Dragon Fury', "Play Firekirin fish games through Dragon Fury's easy online access. Browse available tables and get started today.", 'Firekirin fish tables online — browse available rooms and start in your browser.'),
  game('orionstars', 'Orionstars', 'Fish & Slots', '/optimized/games/orionstars.webp', 'Orionstars Online - Fish Games | Dragon Fury', "Play Orionstars fish games and slots through Dragon Fury's browser-based access. Explore the full game library today.", 'Orionstars fish games and slots with full library access in the browser.'),
  game('cashmachine777', 'CashMachine777', 'Slots', '/optimized/games/cashmachine777.webp', 'CashMachine777 Slots Online | Dragon Fury', 'Play CashMachine777 slots on Dragon Fury. Sign up, open the platform in your browser, and start spinning — no app download.', 'CashMachine777 slots with one-click browser play on Dragon Fury.'),
  game('gameroom', 'Gameroom', 'Casino', '/optimized/games/gameroom.webp', 'Gameroom Online | Dragon Fury', 'Access Gameroom casino games through Dragon Fury. Browser-based play, wide selection, no download required.', 'Gameroom casino titles with simple web login on Dragon Fury.'),
  game('mafia', 'Mafia', 'Fish & Slots', '/games/mafia.webp', 'Mafia Online | Dragon Fury', 'Play Mafia fish games and slots on Dragon Fury. Sign up and launch in your browser — no download required.', 'Mafia fish games and slots with browser-based play on Dragon Fury.'),
  game('gamevault', 'Game Vault', 'Fish & Slots', '/optimized/games/gamevault.webp', 'Game Vault Online | Dragon Fury', 'Play Game Vault fish games and slots on Dragon Fury. Instant browser access with a wide table and slot list.', 'Game Vault fish games and slots, launched straight from Dragon Fury.'),
  game('juwa-2-0', 'Juwa 2.0', 'Fish & Slots', '/optimized/games/juwa2.0.webp', 'Juwa 2.0 Online | Dragon Fury', 'Access Juwa 2.0 fish games and slots through Dragon Fury. No download — sign up and play in your browser.', 'Juwa 2.0 — the next Juwa lineup, playable in your browser on Dragon Fury.'),
  game('milkyway', 'Milkyway', 'Fish & Slots', '/optimized/games/milkyway.webp', 'Milkyway Online | Dragon Fury', 'Launch Milkyway fish games and slots on Dragon Fury. Browser-based access, no app required.', 'Milkyway fish shooting and slots with instant web play.'),
  game('pandamasters', 'Pandamasters', 'Fish & Slots', '/optimized/games/pandamaster.webp', 'Pandamasters Online | Dragon Fury', 'Play Pandamasters fish games and slots through Dragon Fury. Sign up and play in your browser today.', 'Pandamasters fish tables and slots, ready on desktop or phone.'),
  game('riversweeps', 'Riversweeps', 'Fish & Slots', '/optimized/games/riversweeps.webp', 'Riversweeps Online | Dragon Fury', 'Access Riversweeps fish games and slots on Dragon Fury. No download needed — play in any modern browser.', 'Riversweeps fish games and slots with one login on Dragon Fury.'),
  game('vegasx', 'Vegasx', 'Casino & Slots', '/optimized/games/vegasx.webp', 'Vegasx Online | Dragon Fury', 'Play Vegasx casino games and slots on Dragon Fury. Simple login, browser-based play, no app download.', 'Vegasx casino and slots with fast browser play on Dragon Fury.')
];

const ALIASES = {
  'fire-kirin': 'firekirin',
  'orion-stars': 'orionstars',
  'game-vault': 'gamevault',
  'river-sweeps': 'riversweeps',
  'panda-masters': 'pandamasters',
  'juwa-2.0': 'juwa-2-0'
};

function game(slug, name, genre, image, metaTitle, lead, blurb) {
  return {
    slug,
    name,
    genre,
    catalogName: name,
    defaultImage: image,
    metaTitle,
    heroLead: lead,
    heroBlurb: blurb
  };
}

function normalizeStoreCode(str) {
  if (!str || typeof str !== 'string') return '';
  return str.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

const REDIRECT_SLUGS = new Set(['fish-game', 'grandsweeps']);

function resolveSlug(raw) {
  const slug = String(raw || '').trim().toLowerCase();
  if (!slug || REDIRECT_SLUGS.has(slug)) return '';
  return ALIASES[slug] || slug;
}

function defaultButtons(name) {
  return [
    { label: `Play ${name}`, href: '/register' },
    { label: 'All games', href: '/games' }
  ];
}

function catalogFor(storeCode) {
  if (normalizeStoreCode(storeCode) === GOLDENDRAGON) {
    const brand = 'Golden Dragon Casino';
    return CATALOG.map((item) => {
      if (item.slug === 'dragon-fury') {
        return {
          ...item,
          metaTitle: `Dragon Fury Online | ${brand}`,
          heroLead: `Play Dragon Fury on ${brand} in your browser. Sign up free — no download required.`,
          heroBlurb: `Play Dragon Fury online in your browser on ${brand}.`
        };
      }
      const swap = (value) => String(value || '')
        .replace(/ \| Dragon Fury/g, ` | ${brand}`)
        .replace(/ on Dragon Fury/g, ` on ${brand}`)
        .replace(/ through Dragon Fury/g, ` through ${brand}`)
        .replace(/ from Dragon Fury/g, ` from ${brand}`);
      return {
        ...item,
        metaTitle: swap(item.metaTitle),
        heroLead: swap(item.heroLead),
        heroBlurb: swap(item.heroBlurb)
      };
    });
  }
  if (normalizeStoreCode(storeCode) !== PLAYJUWA) return CATALOG;
  return CATALOG.map((item) => {
    if (item.slug === 'dragon-fury') {
      return {
        ...item,
        metaTitle: 'Dragon Fury Online | PlayJuwa',
        heroLead: 'Play Dragon Fury on PlayJuwa in your browser. Sign up free — no download required.',
        heroBlurb: 'Play Dragon Fury online in your browser on PlayJuwa.'
      };
    }
    const swap = (value) => String(value || '')
      .replace(/ \| Dragon Fury/g, ' | PlayJuwa')
      .replace(/ on Dragon Fury/g, ' on PlayJuwa')
      .replace(/ through Dragon Fury/g, ' through PlayJuwa');
    return {
      ...item,
      metaTitle: swap(item.metaTitle),
      heroLead: swap(item.heroLead),
      heroBlurb: swap(item.heroBlurb)
    };
  });
}

/** Shape of one platform page, built from the static catalog entry. */
function toPlain(item, index, storeCode) {
  const name = item.name;
  return {
    id: index + 1,
    storeCode,
    slug: item.slug,
    name,
    genre: item.genre || '',
    catalogName: item.catalogName || name,
    defaultImage: item.defaultImage || '',
    imageUrl: '',
    image: item.defaultImage || '',
    heroLead: item.heroLead || '',
    heroBlurb: item.heroBlurb || '',
    buttons: defaultButtons(name),
    sections: { blocks: [] },
    metaTitle: item.metaTitle || '',
    metaDescription: item.heroLead || '',
    metaTags: '',
    canonicalUrl: '',
    allowIndex: true,
    schemaEnabled: true,
    schemaType: 'WebPage',
    schemaFields: {},
    schemaCustom: '',
    sortOrder: index,
    isActive: true,
    title: item.metaTitle || `${name} Online | Dragon Fury`,
    description: item.heroLead || ''
  };
}

async function listPublic(storeCode) {
  const sc = normalizeStoreCode(storeCode);
  if (!GAME_STORES.has(sc)) return { game_pages: [] };
  return { game_pages: catalogFor(sc).map((item, i) => toPlain(item, i, sc)) };
}

async function getPublic(storeCode, slug) {
  const sc = normalizeStoreCode(storeCode);
  if (!GAME_STORES.has(sc)) return { game_page: null };
  const resolved = resolveSlug(slug);
  if (!resolved) return { game_page: null };
  const catalog = catalogFor(sc);
  const index = catalog.findIndex((item) => item.slug === resolved);
  if (index < 0) return { game_page: null };
  const game_page = toPlain(catalog[index], index, sc);
  const schema = schemaForGamePage({
    origin: PLAYJUWA_ORIGIN,
    storeLabel: PLAYJUWA_ORIGIN.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    page: game_page
  });
  if (schema !== undefined) game_page.schema = schema;
  return { game_page };
}

module.exports = {
  STORE,
  listPublic,
  getPublic,
  resolveSlug
};
