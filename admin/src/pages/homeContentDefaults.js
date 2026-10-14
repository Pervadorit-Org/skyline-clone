/**
 * Starting values shown in the Home Page editor — a mirror of the website's
 * built-in defaults (frontend src/config/homeConfig.js). The admin edits these;
 * whatever is saved is stored in settings `home_page_content` and the website
 * merges it over its own copy of these defaults. Keep roughly in sync with the
 * frontend file when the design changes.
 */
export const SECTION_LABELS = {
  hero1: 'Hero 1 — welcome offer',
  hero2: 'Hero 2 — big banner',
  intro: 'Intro heading',
  categoryStrip: 'Category strip',
  topGames: 'Our Top Games',
  platforms: 'Our Exclusive Platforms',
  reasons: 'More reasons to join',
  providers: 'Providers strip',
  testimonials: 'Testimonials',
  banner1: 'Banner 1 — No Purchase Necessary',
  featureCards: 'Feature cards (3)',
  noPurchase: 'No-Purchase split section',
  banner2: 'Banner 2 — Claim Your Free Coins',
}

export const SECTION_ORDER = [
  'hero1', 'hero2', 'intro', 'categoryStrip', 'topGames', 'platforms',
  'reasons', 'providers', 'testimonials', 'banner1', 'featureCards', 'noPurchase', 'banner2',
]

export const HOME_DEFAULTS = {
  sections: {
    order: [...SECTION_ORDER],
    enabled: {
      hero1: true, hero2: true, intro: true, categoryStrip: true, topGames: true,
      platforms: true, reasons: true, providers: true, testimonials: true,
      banner1: true, featureCards: true, noPurchase: false, banner2: true,
    },
  },
  hero1: {
    bgDesktop: '/static_image/hero-desktop.webp',
    bgMobile: '/static_image/hero-mobile.webp',
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
    line1: 'Grab your', highlight: 'Free Coins', line1b: '&',
    line2: 'Start Winning!', subtitle: 'Welcome to your new Favorite Place to Play',
  },
  categoryStrip: {
    items: [
      { label: 'Home', emoji: '', href: '/' },
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
  topGames: {
    title: 'Our Top Games',
    gameHref: '/register',
    games: [
      { name: 'Golden Dragon', image: '/optimized/games/goldendragon.webp' },
      { name: 'Ultra Panda', image: '/optimized/games/ultrapanda.webp' },
      { name: 'Juwa', image: '/optimized/games/juwa.webp' },
      { name: 'Firekirin', image: '/optimized/games/firekirin.webp' },
      { name: 'Orion Stars', image: '/optimized/games/orionstars.webp' },
      { name: 'Game Vault', image: '/optimized/games/gamevault.webp' },
    ],
  },
  platforms: {
    title: 'Our Exclusive Platforms',
    limit: 15,
    items: [],
  },
  reasons: {
    titleLead: 'More Reasons to',
    title: 'Join Golden Dragon Casino today',
    cards: [
      { icon: '/24-7-support.webp', title: '24/7 Customer Help', body: 'Get the assistance you need quickly and efficiently with our 24/7 customer help team.' },
      { icon: '/same-day-redeemption.webp', title: 'New Games Every Week', body: 'Every week we launch exciting new casino games to keep you on the edge of your seat.' },
      { icon: '/join-million-players.webp', title: 'Join Millions of Players', body: 'Millions of players have joined, with more and more winners joining every day!' },
    ],
  },
  providers: {
    title: 'Providers',
    logos: [
      { name: 'Pragmatic Play', image: '/providers/pragmatic.svg' },
      { name: 'CQ9', image: '/providers/cq9.svg' },
      { name: 'Greentube', image: '/providers/greentube.svg' },
      { name: 'Playtech', image: '/providers/playtech.svg' },
    ],
  },
  testimonials: {
    title: 'Our Players Speak For Us',
    subtitle: 'Hear from our happy clients',
    items: [
      { name: 'Marcus T.', quote: 'Signed up in under two minutes. Hit a solid session and cashed out the same week.', stars: 5 },
      { name: 'Priya K.', quote: 'Love the daily spin and how fast the lobby loads on my phone.', stars: 5 },
      { name: 'Carlos R.', quote: 'Support answered in minutes. Deposits and redemptions were straightforward.', stars: 5 },
    ],
  },
  banner1: {
    bg: '/static_image/play-for-free-bg.webp',
    character: '/static_image/play-for-free-character.webp',
    characterMobile: '/static_image/play-for-free-character-mobile.webp',
    title: 'No Purchase Necessary',
    body: 'Play the very best newly released social casino games with Gold Coins.',
    ctaLabel: 'Play For Free',
    ctaHref: '/register',
    characterSide: 'right',
  },
  featureCards: [
    { icon: '🎮', title: 'Play For Free', body: 'Enjoy the fun for free.' },
    { icon: '🎰', title: "100's Of Games", body: 'There is always something to play.' },
    { icon: '🎧', title: '24/7 Customer Help', body: 'Get the assistance you need quickly and efficiently.' },
  ],
  noPurchase: {
    title: 'No Purchase Necessary',
    body: 'Play the very best newly released social casino games with Gold Coins.',
    character: '/df-online/dragons/tier-dragon-lord.webp',
    ctaLabel: 'Play For Free',
    ctaLabelMobile: "Play Now - It's Free",
    ctaHref: '/register',
  },
  banner2: {
    bgColor: '#2F6B2F',
    character: '/static_image/claim-your-coin-character.webp',
    title: 'Claim Your Free Coins',
    body: 'Our thriving social casino community is focused entirely on having fun — join and start winning today?',
    ctaLabel: 'Play For Free',
    ctaHref: '/register',
    characterSide: 'left',
  },
}
