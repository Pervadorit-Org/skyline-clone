/**
 * Single source of truth for the /casino lobby layout (copy, art, row order).
 * Game rows themselves come from the live provider catalog; this file only
 * decides how they are presented. All artwork is DragonFury's own.
 */
import { site } from './site';

export const casinoLobbyConfig = {
  banners: [
    {
      id: 'first-purchase',
      kicker: '100% BONUS',
      title: 'FIRST PURCHASE',
      body: 'Only for the next 12 hours. Browse the store now!',
      ctaLabel: 'GET COINS!',
      href: '/store',
      art: '/df-online/dragons/tier-dragon-lord.webp',
      from: '#2a1230',
      to: '#0e0b1c',
    },
    {
      id: 'daily-spin',
      kicker: 'FREE EVERY DAY',
      title: 'SPIN THE WHEEL',
      body: 'Win Gold and Sweep Coins — free spins every 24 hours.',
      ctaLabel: 'SPIN NOW',
      href: '/spinwheel',
      art: '/df-online/dragons/tier-fury.webp',
      from: '#10264a',
      to: '#0e0b1c',
    },
    {
      id: 'community',
      kicker: 'JOIN OUR COMMUNITY',
      title: 'FOR EVEN MORE...',
      body: `Refer a friend and claim your daily rewards on ${site.platformName}.`,
      ctaLabel: 'JOIN NOW',
      href: '/account/affiliate',
      art: '/df-online/dragons/tier-drake.webp',
      from: '#2b1450',
      to: '#0e0b1c',
    },
    {
      id: 'refer',
      kicker: 'INVITE FRIENDS',
      title: 'SHARE THE REWARDS',
      body: `Invite friends to ${site.platformName} and earn on their first purchases.`,
      ctaLabel: 'INVITE NOW',
      href: '/account/affiliate',
      art: '/df-online/dragons/tier-elder-dragon.webp',
      from: '#3a1d0a',
      to: '#0e0b1c',
    },
  ],
  bannerIntervalMs: 5000,

  // Image banners for signed-in players are managed in Admin → Pages → Lobby (banners). While none are
  // uploaded, the three built-in slides above (our own art) are shown for everyone.
  imageBanners: [
    { id: 'img-first-purchase', label: 'First Purchase', href: '/store', desktop: '/ref/lobby/banners/first-purchase-d.webp', mobile: '/ref/lobby/banners/first-purchase-m.webp' },
    { id: 'img-daily-tasks', label: 'Daily Rewards', href: '/daily-bonus', desktop: '/ref/lobby/banners/daily-tasks-d.webp', mobile: '/ref/lobby/banners/daily-tasks-m.webp' },
    { id: 'img-spin-wheel', label: 'Spin the Wheel', href: '/spinwheel', desktop: '/ref/lobby/banners/spin-wheel-d.webp', mobile: '/ref/lobby/banners/spin-wheel-m.webp' },
    { id: 'img-referral', label: 'Refer a Friend', href: '/account/affiliate', desktop: '/ref/lobby/banners/referral-d.webp', mobile: '/ref/lobby/banners/referral-m.webp' },
    { id: 'img-vip', label: 'VIP', href: '/vip', desktop: '/ref/lobby/banners/vip-d.webp', mobile: '/ref/lobby/banners/vip-m.webp' },
    { id: 'img-community', label: 'Community', href: '', desktop: '/ref/lobby/banners/community-d.webp', mobile: '/ref/lobby/banners/community-m.webp' },
  ],

  promoCards: [
    {
      id: 'daily',
      title: 'DAILY REWARDS',
      subtitle: 'Claim rewards every day!',
      ctaLabel: 'CLAIM NOW',
      href: '/daily-bonus',
      art: '/df-online/sc-coin.webp',
      // Card background artwork (chest of coins). Falls back to `art` if unset.
      bg: '/P1.png',
      variant: 'daily',
    },
    {
      id: 'spin',
      title: 'Spin the Wheel',
      subtitle: 'Win Gold and Sweep Coins',
      note: 'Get free spins every 24 hours!',
      ctaLabel: 'SPIN',
      href: '/spinwheel',
      // Card background artwork (dragon wall).
      bg: '/df-online/skyline.webp',
      // Wheel artwork: the segments spin slowly behind the fixed outer ring.
      wheel: {
        segments: '/ref/lobby/wheel-segments.webp',
        ring: '/ref/lobby/wheel-ring.webp',
      },
      variant: 'spin',
    },
  ],

  // Category pills under the promo cards (first = lobby home).
  categories: [
    { id: '', label: 'Home', icon: '/df-online/club-icons/gamepad.svg' },
    { id: 'bingo', label: 'Bingo', icon: '/df-online/club-icons/bingo.svg' },
    { id: 'crash-game', label: 'Crash Game', icon: '/df-online/club-icons/crash.svg' },
    { id: 'fishing', label: 'Fishing', icon: '/df-online/club-icons/fish.svg' },
    { id: 'instant-win', label: 'Instant Win', icon: '/df-online/club-icons/instant.svg' },
    { id: 'keno', label: 'Keno', icon: '/df-online/club-icons/keno.svg' },
    { id: 'live-casino', label: 'Live Dealer', icon: '/df-online/club-icons/dice.svg' },
    { id: 'lottery', label: 'Lottery', icon: '/df-online/club-icons/lottery.svg' },
    { id: 'scratch-cards', label: 'Scratch Cards', icon: '/df-online/club-icons/scratch.svg' },
    { id: 'shooting', label: 'Shooting', icon: '/df-online/club-icons/shooting.svg' },
    { id: 'slots', label: 'Slots', icon: '/df-online/club-icons/slots-777.svg' },
    { id: 'table-games', label: 'Table Games', icon: '/df-online/club-icons/cards.svg' },
    { id: 'virtual-game', label: 'Virtual Game', icon: '/df-online/club-icons/virtual.svg' },
  ],

  recentWinsTitle: 'Recent Big Wins',

  // Presentation cycled across the catalog categories, top to bottom.
  //  row    – single scrolling line
  //  grid   – 3 lines, first tile is a 2x2 feature tile
  //  banner – branded panel on the left, tiles on the right
  //  top10  – numbered ranking line
  rowPattern: ['row', 'grid', 'row', 'banner', 'row', 'top10', 'row', 'grid', 'banner', 'row'],
  rowTileLimit: { row: 18, grid: 22, banner: 8, top10: 10 },

  // Art shown in the left panel of each "banner" row, cycled in order of
  // appearance. All artwork is DragonFury's own.
  bannerArt: [
    { art: '/partners/bgaming.webp', from: '#e0b64a', to: '#161007' },
    { art: '/df-online/platforms/golden-dragon.webp', from: '#13233f', to: '#07040b' },
    { art: '/df-online/dragons/tier-elder-dragon.webp', from: '#3a1d0a', to: '#0b0710' },
  ],

  // Extra sections slotted in after the Nth category row (1-based).
  inserts: {
    2: 'packages',
    6: 'inviteDeals',
    7: 'exclusive',
  },

  packages: { title: 'Available Packages', limit: 8, href: '/store' },

  invite: {
    kicker: 'INVITE FRIENDS PROGRAM',
    title: 'Share the Rewards!',
    body: 'Up to',
    highlight: '10%',
    note: 'of their first 3 purchases',
    ctaLabel: 'Copy Link',
    href: '/account/affiliate',
    art: '/ref/lobby/exclusive/invite-card.webp',
  },
  deals: {
    title: 'Deals of The Day',
    seeAllHref: '/store',
    amount: '100,000',
    bonus: '10 FREE SC CASH',
    price: '$9.50',
    ctaHref: '/store',
  },

  exclusive: {
    title: 'Exclusive Platforms',
    headline: 'PLAY & WIN WITH',
    highlight: 'SWEEP COINS',
    href: '/platform',
    art: '/df-online/dragons/tier-drake.webp',
  },

  pick: {
    title: "Can't decide what to play?",
    subtitle: "We'll recommend a random game just for you.",
    ctaLabel: 'Pick for me',
  },

  winners: {
    titleLead: 'Look at our',
    titleHighlight: 'TOP WINNERS',
    columns: [
      { id: 'day', label: 'Winnings per day', tab: 'today', offset: 0 },
      { id: 'month', label: 'Winnings per month', tab: 'weekly', offset: 0 },
      { id: 'top', label: 'Top X per month', tab: 'today', offset: 2 },
    ],
    initialRows: 4,
    showMoreLabel: 'Show More',
  },
};

export default casinoLobbyConfig;
