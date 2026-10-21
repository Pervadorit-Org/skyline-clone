'use strict';

const SCORPIO_POPULAR_SLOT_NAMES = require('./scorpioPopularSlots');
const { isHiddenBrokenProviderGame } = require('./hiddenBrokenGames');

/** Extra slot titles merged into the Scorpio lobby ordering (kept from the retired curated Slots list). */
const SLOTS_EXTRA_LOBBY_TITLES = [
  'Hip Hop Panda',
  'Wild Bandito',
  'Prosperity Lion',
  'Dragon Legend',
  'Fortune Gods',
  'Leprechaun Riches',
  "Santa's Gift Rush",
  'Phoenix Rises',
  'Captain Bounty',
  'Honey Trap Of Diao Chan',
  'Wild Fireworks',
  'Medusa',
  'Cruise Royale',
  'Mr. Hallow-Win',
  'Plushie Frenzy',
  'Ganesha Gold',
  'Medusa II',
  'Candy Burst',
  'Buffalo Win',
  'Heist Stakes',
  'Gem Saviour Sword',
  'Double Fortune',
  'Forge of Wealth',
  "Egypt's Book of Mystery",
  'Destined for Riches',
  'Cocktail Nights',
  'Rooster Rumble',
  'Treasures of Aztec',
  'Legend of Hou Yi'
];

const ONEGAMEHUB_SLOT_IDS = new Set();

const SLOT_CATEGORY_ALIASES = new Set(['slot', 'slots']);

function catalogGameId(game) {
  return String(game?.id ?? game?.gameId ?? game?.gameid ?? game?.game_id ?? '').trim();
}

function oneGameHubCategoryId(game) {
  const raw =
    (Array.isArray(game?.categories) && game.categories[0]) ||
    game?.category ||
    game?.type ||
    'slots';
  return String(raw || 'slots')
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, '-')
    .replace(/\s+/g, '-');
}

function isOneGameHubSlotCategory(game) {
  const slug = oneGameHubCategoryId(game);
  return !slug || SLOT_CATEGORY_ALIASES.has(slug);
}

function filterOneGameHubUserGames(games) {
  if (!Array.isArray(games)) return [];
  const visible = games.filter((game) => !isHiddenBrokenProviderGame(game));
  if (ONEGAMEHUB_SLOT_IDS.size === 0) return visible;
  return visible.filter((game) => {
    if (!isOneGameHubSlotCategory(game)) return true;
    return ONEGAMEHUB_SLOT_IDS.has(catalogGameId(game).toLowerCase());
  });
}

function compactSlotTitle(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');
}

function isScorpioPgSoftStudio(game = {}) {
  const hay = [
    game.providerName,
    game.brand,
    game.studio,
    game.provider
  ]
    .map((value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ''))
    .join(' ');
  return hay.includes('pgsoft') || hay.includes('pocketgames');
}

function isScorpioSlotGame(game) {
  if (isScorpioPgSoftStudio(game)) return false;
  const type = Number(game?.gameType);
  if (Number.isFinite(type)) return type === 0;
  const label = String(game?.gameTypeLabel || '').trim().toLowerCase();
  return !label || label === 'slots' || label === 'slot';
}

const SCORPIO_LOBBY_TITLES = [
  ...SCORPIO_POPULAR_SLOT_NAMES,
  ...SLOTS_EXTRA_LOBBY_TITLES
]
  .map(compactSlotTitle)
  .filter(Boolean);

function matchesScorpioLobbyTitle(game) {
  const title = compactSlotTitle(game?.name || game?.gameName || game?.title);
  if (!title) return false;
  for (const needle of SCORPIO_LOBBY_TITLES) {
    if (title === needle) return true;
    const shortest = Math.min(title.length, needle.length);
    if (shortest < 10) continue;
    if (title.includes(needle) || needle.includes(title)) return true;
  }
  return false;
}

function filterScorpioUserGames(games) {
  if (!Array.isArray(games)) return [];
  return games.filter(
    (game) => String(game?.gameCode || game?.gameId || '').trim() && !isHiddenBrokenProviderGame(game)
  );
}

module.exports = {
  SLOTS_EXTRA_LOBBY_TITLES,
  ONEGAMEHUB_SLOT_IDS,
  filterOneGameHubUserGames,
  filterScorpioUserGames
};
