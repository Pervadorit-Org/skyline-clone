import { LOBBY_DEFAULT_SECTIONS, LOBBY_FEATURED_ART } from '../../config/lobbyDefaults';
import { MOSAIC_PATTERNS } from '../../config/lobbyMosaicPatterns';

/**
 * Turns the game list (provider catalog) + the lobby layout (defaults, then the admin's changes)
 * into the rows the lobby renders. Pure functions: no fetching here.
 */

const MIN_GAMES = { featured: 4, rows: 1, mosaic: 6, grid: 6, rank: 3 };
const norm = (s) => String(s || '').trim().toLowerCase();

export const gameKey = (g) => String(g?.gameid ?? g?.id ?? '').trim();

function brandOf(game) {
  return String(game?.brand || game?.studio || game?.providerName || '').trim();
}

/** Studios by number of games, biggest first. */
function rankBrands(games) {
  const counts = new Map();
  for (const g of games) {
    const b = brandOf(g);
    if (!b) continue;
    counts.set(b, (counts.get(b) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name);
}

function windowOf(list, offset, count) {
  if (!list.length) return [];
  const start = list.length > offset ? offset : offset % list.length;
  const out = list.slice(start, start + count);
  // wrap around so a short catalog still fills the row
  for (let i = 0; out.length < Math.min(count, list.length) && i < list.length; i += 1) {
    const g = list[i];
    if (!out.includes(g)) out.push(g);
  }
  return out;
}

function hasWord(game, words) {
  const hay = `${game?.title || ''} ${game?.name || ''} ${(game?.categories || []).join(' ')} ${(game?.subcategories || []).join(' ')}`.toLowerCase();
  return words.some((w) => hay.includes(w));
}

/** Layout list: defaults in the admin's order, minus rows the admin switched off. */
export function resolveLayout(content = {}) {
  const sectionsCfg = content.sections || {};
  const byId = new Map(LOBBY_DEFAULT_SECTIONS.map((s) => [s.id, s]));
  const order = Array.isArray(sectionsCfg.order) ? sectionsCfg.order.filter((id) => byId.has(id)) : [];
  const rest = LOBBY_DEFAULT_SECTIONS.map((s) => s.id).filter((id) => !order.includes(id));
  const ids = [...order, ...rest];
  return ids
    .filter((id) => sectionsCfg.enabled?.[id] !== false)
    .map((id) => {
      const def = byId.get(id);
      const title = String(sectionsCfg.titles?.[id] || '').trim();
      const count = Number(sectionsCfg.counts?.[id]);
      return {
        ...def,
        ...(title ? { title } : {}),
        ...(Number.isFinite(count) && count > 0 ? { count } : {}),
      };
    });
}

/**
 * @param {object[]} allGames       playable games from the catalog
 * @param {(catalogId: string) => object[]} categoryGames  games of one category
 * @param {object} content          admin-managed lobby content (may be empty)
 * @param {string[]} popular        game ids, most played first (empty = keep the game-list order)
 */
export function buildLobbySections(allGames, categoryGames, content = {}, popular = []) {
  const hidden = new Set((content.hiddenGames || []).map(String));
  const visible = (list) => list.filter((g) => !hidden.has(gameKey(g)));
  const games = visible(allGames || []);
  if (!games.length) return [];

  const byId = new Map();
  for (const g of games) {
    for (const key of [gameKey(g), String(g.id || ''), `${norm(g.provider)}:${gameKey(g)}`]) {
      if (key && !byId.has(key)) byId.set(key, g);
    }
  }
  const brands = rankBrands(games);
  const picks = content.picks || {};

  const pick = (def) => {
    const ids = picks[def.id];
    if (Array.isArray(ids) && ids.length) return ids.map((id) => byId.get(String(id))).filter(Boolean);
    return null;
  };

  const rankOf = new Map((popular || []).map((id, i) => [String(id), i]));
  const byPlays = (pool) => pool
    .filter((g) => rankOf.has(gameKey(g)))
    .sort((a, b) => rankOf.get(gameKey(a)) - rankOf.get(gameKey(b)));

  const gamesFor = (def, count) => {
    const chosen = pick(def);
    if (chosen) return chosen.slice(0, count);
    const src = def.source || {};
    // Top 10 / Trending / Top Games: most played first, when the play ranking is known.
    if (typeof def.popular === 'number' && rankOf.size) {
      const pool = src.kind === 'category' ? visible(categoryGames(src.catalogId)) : games;
      const ranked = byPlays(pool).slice(def.popular, def.popular + count);
      if (ranked.length) {
        const used = new Set(ranked);
        const rest = pool.filter((g) => !used.has(g) && !rankOf.has(gameKey(g)));
        return [...ranked, ...rest].slice(0, count);
      }
    }
    switch (src.kind) {
      case 'category':
        return visible(categoryGames(src.catalogId)).slice(0, count);
      case 'brand': {
        const cfg = content.featured?.[def.id] || {};
        const brand = cfg.brand || brands[src.index] || '';
        if (!brand) return [];
        return games.filter((g) => norm(brandOf(g)) === norm(brand)).slice(0, count);
      }
      case 'new':
        return [...games].reverse().slice(0, count);
      case 'top':
        return games.slice(0, count);
      case 'keyword': {
        const matched = games.filter((g) => hasWord(g, src.words || []));
        return matched.length >= MIN_GAMES.mosaic ? matched.slice(0, count) : windowOf(games, src.offset || 0, count);
      }
      case 'all':
      default:
        return windowOf(games, src.offset || 0, count);
    }
  };

  const sections = [];
  let featuredIndex = 0;
  for (const def of resolveLayout(content)) {
    const count = def.count || (def.type === 'rows' ? (def.lines || 1) * (def.perLine || 12) : 20);
    const list = gamesFor(def, def.type === 'rows' && !def.count ? (def.lines || 1) * (def.perLine || 12) : count);
    if (list.length < (MIN_GAMES[def.type] || 1)) continue;

    const base = {
      id: def.id,
      type: def.type,
      title: def.title,
      icon: def.icon,
      iconIsCategory: Boolean(def.categoryIcon),
      viewAll: def.viewAll,
    };

    if (def.type === 'rows') {
      const perLine = def.perLine || 12;
      const rows = [];
      for (let i = 0; i < list.length; i += perLine) rows.push(list.slice(i, i + perLine));
      sections.push({ ...base, rows });
    } else if (def.type === 'mosaic') {
      const pattern = MOSAIC_PATTERNS[def.pattern] || MOSAIC_PATTERNS.a;
      const cells = list.slice(0, pattern.length).map((g, i) => ({
        ...g,
        _cell: { col: pattern[i][0], row: pattern[i][1], cs: pattern[i][2], rs: pattern[i][3] },
      }));
      sections.push({ ...base, games: cells });
    } else if (def.type === 'featured') {
      const cfg = content.featured?.[def.id] || {};
      const brand = cfg.brand || brandOf(list[0]);
      sections.push({
        ...base,
        title: def.title === 'Featured' && brand ? brand : def.title,
        brand,
        bgDesktop: cfg.bgDesktop || '',
        bgMobile: cfg.bgMobile || cfg.bgDesktop || '',
        fallbackArt: LOBBY_FEATURED_ART[featuredIndex % LOBBY_FEATURED_ART.length],
        games: list,
      });
      featuredIndex += 1;
    } else {
      sections.push({ ...base, games: list });
    }
  }
  return sections;
}
