/**
 * Single source of truth for the HOME PAGE (guest/logged-out view only).
 *
 * Every Home2* component under `src/components/Home/Home2/` reads from this
 * file. Nothing about copy, color, spacing or ordering should be hardcoded
 * inside those components — change a value here and the page updates.
 *
 * Scope: this config only drives the guest landing body rendered by
 * `src/pages/Home/index.jsx` when `showGuestSections` is true. The
 * authenticated dashboard (sidebar, live games grid, wallet, deposit/withdraw)
 * is untouched and does not read this file. The site-wide Navbar and
 * LandingFooter are also untouched (shared by every route) — this file only
 * controls the sections rendered *between* them on `/`.
 *
 * Image slots left as "" render a neutral placeholder box (see ImageSlot.jsx)
 * with a `// TODO: replace asset` marker instead of hotlinking or inventing art.
 * Required pixel sizes for each empty slot are documented inline below.
 */
import { site } from './site';

export const homeConfig = {
  theme: {
    colors: {
      bg: '#0F0F19',
      card: '#161B2E',
      gold: '#EBC567',
      goldFrom: '#FCE981',
      goldTo: '#D89829',
      onGold: '#01113E',
      heroOutline: '#5B0A2E',
      accentBlue: '#3B82F6',
      muted: '#6B7280',
      footerLink: '#BEBEBE',
      ctaGlow: 'rgba(179,255,192,.78)',
      banner1: '#0B3B3F',
      banner2: '#2F6B2F',
      text: '#FFFFFF',
    },
    fonts: {
      hero: "'Baloo Bhaijaan 2', sans-serif",
      heading: "'Outfit', sans-serif",
      body: "'Montserrat', sans-serif",
    },
    radius: {
      card: 16,
      tab: 12,
      cta: 15,
      heroBottom: 250,
      banner: 20,
      tile: 10,
      pill: 9999,
    },
    layout: {
      heroMax: 1700,
      column: 1152,
      features: 1280,
      testimonials: 1264,
      footer: 1328,
      navHeight: 68,
    },
  },

  // Nav itself is untouched (shared across every page) — these are just the
  // real routes reused by CTAs in this config (hero, banners, etc.).
  nav: {
    loginLabel: 'Login',
    signupLabel: 'Sign Up',
    loginHref: '/login',
    signupHref: '/register',
  },

  hero1: {
    bgDesktop: '/static_image/hero-desktop.webp',
    bgMobile: '/static_image/hero-mobile.webp',
    logo: site.logoUrl,
    eyebrow: 'Welcome Bonus',
    offer: 'CLAIM GC 150,000 + 2 SC',
    ctaLabel: 'Claim Now',
    ctaHref: '/register',
  },

  hero2: {
    imageDesktop: '/static_image/banner-web.webp',
    imageMobile: '/static_image/banner-mobile.webp',
    alt: 'Play - Win - Redeem',
    href: '/register',
  },

  intro: {
    line1: 'Grab your',
    highlight: 'Free Coins',
    line1b: '&',
    line2: 'Start Winning!',
    subtitle: 'Welcome to your new Favorite Place to Play',
  },

  // Horizontal game-category strip (scrollable pills, first = active).
  // Icons are our own (inline house SVG for Home + emoji glyphs) — NOT
  // goldendragon.casino's hosted game-category PNGs. Each pill links to its
  // own category page (/category/<slug>, see config/gameCategories.js), which
  // shows that category's games; Home links back to the landing page.
  categoryStrip: {
    items: [
      { label: 'Home', icon: 'home', href: '/' },
      { label: 'Bingo', emoji: '🎱', href: '/category/bingo' },
      { label: 'Crash Game', emoji: '📈', href: '/category/crash-game' },
      { label: 'Fishing', emoji: '🎣', href: '/category/fishing' },
      { label: 'Instant Win', emoji: '⚡', href: '/category/instant-win' },
      { label: 'Keno', emoji: '🔢', href: '/category/keno' },
      { label: 'Live Dealer', emoji: '🃏', href: '/category/live-dealer' },
      { label: 'Lottery', emoji: '🎟️', href: '/category/lottery' },
      { label: 'Scratch Cards', emoji: '🎫', href: '/category/scratch-cards' },
      { label: 'Shooting', emoji: '🎯', href: '/category/shooting' },
      { label: 'Slots', emoji: '🎰', href: '/category/slots' },
      { label: 'Table Games', emoji: '🂡', href: '/category/table-games' },
      { label: 'Virtual Game', emoji: '🕹️', href: '/category/virtual-game' },
    ],
  },

  // Heading + a static showcase grid of game tiles (shown when the live
  // provider catalog is empty, e.g. before backend game credentials are set).
  // Images are DragonFury's OWN game art already in /public/optimized/games.
  // When the real `DashboardSlotGamesSection` catalog has games, it renders
  // below and these static tiles are hidden automatically (see TopGamesSection).
  topGames: {
    title: 'Our Top Games',
    games: [
      { name: 'Golden Dragon', image: '/optimized/games/goldendragon.webp' },
      { name: 'Ultra Panda', image: '/optimized/games/ultrapanda.webp' },
      { name: 'Juwa', image: '/optimized/games/juwa.webp' },
      { name: 'Firekirin', image: '/optimized/games/firekirin.webp' },
      { name: 'Orion Stars', image: '/optimized/games/orionstars.webp' },
      { name: 'Milky Way', image: '/optimized/games/milkyway.webp' },
      { name: 'Game Vault', image: '/optimized/games/gamevault.webp' },
      { name: 'Vegas X', image: '/optimized/games/vegasx.webp' },
      { name: 'Panda Master', image: '/optimized/games/pandamaster.webp' },
      { name: 'Cash Machine', image: '/optimized/games/cashmachine777.webp' },
      { name: 'Ultra Thunder', image: '/optimized/games/ultathunder.webp' },
      { name: 'Egame99', image: '/optimized/games/egame99.webp' },
      { name: 'Riversweeps', image: '/optimized/games/riversweeps.webp' },
      { name: 'Dragon Fury', image: '/optimized/games/dragonfury.webp' },
    ],
    gameHref: '/register',
  },

  // Real curated platform tiles (Golden Dragon, Juwa, Firekirin, …) from
  // src/config/featuredPlatformGames.js — the same data already used on the
  // live guest landing page. `limit` matches the spec's 15-tile grid.
  platforms: {
    title: 'Our Exclusive Platforms',
    limit: 15,
  },

  // Detailed "reasons to join" cards. Uses already-shipped icon assets in
  // /public. Defined inline (not from JOIN_REASONS) so this guest-home copy can
  // differ from the shared LandingInfoSections list without affecting it.
  reasons: {
    titleLead: 'More Reasons to',
    title: `Join ${site.platformName} today`,
    cards: [
      {
        icon: '/24-7-support.webp',
        title: '24/7 Customer Help',
        body: 'Get the assistance you need quickly and efficiently with our 24/7 customer help team.',
      },
      {
        icon: '/same-day-redeemption.webp',
        title: 'New Games Every Week',
        body: 'Every week we launch exciting new casino games to keep you on the edge of your seat.',
      },
      {
        icon: '/join-million-players.webp',
        title: 'Join Millions of Players',
        body: `Millions of players have joined ${site.platformName}, with more and more winners joining every day!`,
      },
    ],
  },

  // Real existing copy from the live site (src/components/LandingTestimonials.jsx),
  // reshaped into the config-driven 3x2 grid the spec asks for.
  testimonials: {
    title: 'Our Players Speak For Us',
    subtitle: 'Hear from our happy clients',
    items: [
      { name: 'Marcus T.', quote: `Signed up on ${site.platformName} in under two minutes. Hit a solid session and cashed out the same week.`, stars: 5 },
      { name: 'Priya K.', quote: 'Love the daily spin and how fast the lobby loads on my phone. Feels like a real casino app.', stars: 5 },
      { name: 'Carlos R.', quote: 'Support answered in minutes when I had a question. Deposits and redemptions were straightforward.', stars: 5 },
      { name: 'Dana L.', quote: 'Huge game selection — fish, casino, sweepstakes titles. I keep finding new platforms to try.', stars: 5 },
      { name: 'Sam W.', quote: 'Referral bonus was a nice surprise. My friends joined and we all play on the same lobby now.', stars: 5 },
      { name: 'Mia F.', quote: 'The welcome bonus got me started without any purchase. Spin wheel and promos keep it fun.', stars: 5 },
    ],
  },

  banner1: {
    bg: '/static_image/play-for-free-bg.webp',
    character: '/static_image/play-for-free-character.webp',
    characterMobile: '/static_image/play-for-free-character-mobile.webp',
    title: 'No Purchase Necessary',
    body: 'Play the very best newly released social casino games with Gold Coins. Choose from amazing selections of games and many more. Keep the fun going by unlocking extra spins, bonus rounds and more. Feel the real thrills of Vegas at your fingertips.',
    ctaLabel: 'Play For Free',
    ctaHref: '/register',
    characterSide: 'right',
  },

  featureCards: [
    { icon: '🎮', title: 'Play For Free', body: 'Enjoy the fun for free.' },
    { icon: '🎰', title: "100's Of Games", body: `There is always something to play on ${site.platformName}.` },
    { icon: '🎧', title: '24/7 Customer Help', body: 'Get the assistance you need quickly and efficiently with our 24/7 customer help team.' },
  ],

  // "No Purchase Necessary" split section (text left, character right).
  // Background is a CSS gradient + DragonFury's own dragon art — NOT
  // goldendragon.casino/landing/play-for-free-*.webp (their hosted artwork).
  noPurchase: {
    title: 'No Purchase Necessary',
    body: 'Play the very best newly released social casino games with Gold Coins. Keep the fun going by unlocking extra spins, bonus rounds and more — the real thrills of Vegas at your fingertips.',
    character: '/df-online/dragons/tier-dragon-lord.webp',
    ctaLabel: 'Play For Free',
    ctaLabelMobile: "Play Now - It's Free",
    ctaHref: '/register',
  },

  // "Free coins" CTA banner.
  banner2: {
    bg: 'banner2',
    character: '/static_image/claim-your-coin-character.webp',
    title: 'Claim Your Free Coins',
    body: `Our thriving social casino community is focused entirely on having fun, so why not join the ${site.platformName} party and start winning today?`,
    ctaLabel: 'Play For Free',
    ctaHref: '/register',
    characterSide: 'left',
  },

  // Footer and support button are shared, site-wide components and are left
  // completely untouched by this redesign — kept here only as display toggles.
  footer: {},
  support: {},

  // Toggle + order. The guest body in src/pages/Home/index.jsx renders
  // whichever of these are `true`, in this array's order. `footer` and
  // `support` are informational only (both already render globally).
  sections: {
    order: [
      'hero1',
      'hero2',
      'intro',
      'categoryStrip',
      'topGames',
      'platforms',
      'reasons',
      'testimonials',
      'banner1',
      'featureCards',
      'banner2',
    ],
    enabled: {
      hero1: true,
      hero2: true,
      intro: true,
      categoryStrip: true,
      topGames: true,
      platforms: true,
      reasons: true,
      testimonials: true,
      banner1: true,
      featureCards: true,
      noPurchase: false,
      banner2: true,
      footer: true,
      support: true,
    },
  },
};

export default homeConfig;
