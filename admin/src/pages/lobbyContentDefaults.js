/**
 * The rows of the signed-in lobby, in default order. Mirror of frontend/src/config/lobbyDefaults.js
 * (ids and default titles), so the editor shows what the website shows when nothing was saved.
 *   kind   what fills the row:  category | studio | all | newest | top | keyword
 */
export const LOBBY_ROWS = [
  { id: 'feat-1', type: 'featured', title: 'Featured', kind: 'studio', count: 21 },
  { id: 'cat-bingo', type: 'rows', title: 'Bingo', kind: 'category', count: 12 },
  { id: 'mosaic-picks', type: 'mosaic', title: "Editor's Picks", kind: 'all', count: 25 },
  { id: 'cat-crash-game', type: 'rows', title: 'Crash Game', kind: 'category', count: 12 },
  { id: 'feat-2', type: 'featured', title: 'Featured', kind: 'studio', count: 18 },
  { id: 'mosaic-arcade', type: 'mosaic', title: 'Arcade', kind: 'all', count: 30 },
  { id: 'cat-fishing', type: 'rows', title: 'Fishing', kind: 'category', count: 36 },
  { id: 'top10', type: 'rank', title: 'Top 10 Games', kind: 'top', count: 10 },
  { id: 'trending', type: 'mosaic', title: 'Trending Games', kind: 'all', count: 18 },
  { id: 'cat-instant-win', type: 'rows', title: 'Instant Win', kind: 'category', count: 12 },
  { id: 'feat-3', type: 'featured', title: 'Featured', kind: 'studio', count: 25 },
  { id: 'top-games', type: 'mosaic', title: 'Top Games', kind: 'all', count: 32 },
  { id: 'cat-keno', type: 'rows', title: 'Keno', kind: 'category', count: 12 },
  { id: 'jackpot', type: 'mosaic', title: 'Jackpot Zone', kind: 'keyword', count: 29 },
  { id: 'cat-live-dealer', type: 'rows', title: 'Live Dealer', kind: 'category', count: 12 },
  { id: 'cat-lottery', type: 'rows', title: 'Lottery', kind: 'category', count: 12 },
  { id: 'new', type: 'grid', title: 'New Games', kind: 'newest', count: 20 },
  { id: 'after-dark', type: 'mosaic', title: 'After Dark', kind: 'all', count: 32 },
  { id: 'cat-scratch-cards', type: 'rows', title: 'Scratch Cards', kind: 'category', count: 12 },
  { id: 'top10-fishing', type: 'rank', title: 'Top 10 Fish Games', kind: 'category', count: 10 },
  { id: 'cat-shooting', type: 'rows', title: 'Shooting', kind: 'category', count: 12 },
  { id: 'casual', type: 'mosaic', title: 'Casual Fun', kind: 'all', count: 20 },
  { id: 'cat-slots', type: 'rows', title: 'Slots', kind: 'category', count: 36 },
  { id: 'feat-4', type: 'featured', title: 'Featured', kind: 'studio', count: 20 },
  { id: 'cat-table-games', type: 'rows', title: 'Table Games', kind: 'category', count: 12 },
]

export const KIND_HELP = {
  category: 'Games of this category from the game list (Game List API categories).',
  studio: 'Games of one studio. Leave the studio empty for the Nth biggest studio in the game list.',
  all: 'A set of games from the whole game list.',
  newest: 'The newest games in the game list.',
  top: 'The first games in the game list.',
  keyword: 'Games whose title or tags mention “jackpot”; falls back to a set from the whole list.',
}

export const LOBBY_DEFAULTS = {
  banners: [],
  sections: { order: [], enabled: {}, titles: {}, counts: {} },
  picks: {},
  featured: {},
  hiddenGames: [],
  text: {},
  off: [],
  providers: [],
  sidebarLinks: [],
  popularity: { mode: 'auto', days: 30 },
}

/** Rows whose games follow real play history when nothing is picked by hand. */
export const POPULAR_ROWS = [
  { id: 'top10', title: 'Top 10 Games', from: 0, count: 10 },
  { id: 'trending', title: 'Trending Games', from: 10, count: 18 },
  { id: 'top-games', title: 'Top Games', from: 28, count: 32 },
  { id: 'top10-fishing', title: 'Top 10 Fish Games', from: 0, count: 10, note: 'fishing games only (automatic)' },
]

/* ---------------- text, cards and panels (lobby_content.text / .off) ---------------- */
// field: { path, label, default, type?: 'long' | 'image' | 'link' }. Saved under text[path]; empty = built-in.
// toggle: key in lobby_content.off (the item is hidden on the website while it is listed).
const f = (path, label, def, type) => ({ path, label, default: def, type })

export const CARD_GROUPS = [
  { title: 'Banner slide 1 (built-in)', toggle: 'banner:first-purchase', fields: [
    f('banners.0.kicker', 'Small heading', '100% BONUS'), f('banners.0.title', 'Title', 'FIRST PURCHASE'),
    f('banners.0.body', 'Text', 'Only for the next 12 hours. Browse the store now!', 'long'),
    f('banners.0.ctaLabel', 'Button label', 'GET COINS!'), f('banners.0.href', 'Button link', '/store', 'link'),
    f('banners.0.art', 'Picture', '/df-online/dragons/tier-dragon-lord.webp', 'image'),
  ] },
  { title: 'Banner slide 2 (built-in)', toggle: 'banner:daily-spin', fields: [
    f('banners.1.kicker', 'Small heading', 'FREE EVERY DAY'), f('banners.1.title', 'Title', 'SPIN THE WHEEL'),
    f('banners.1.body', 'Text', 'Win Gold and Sweep Coins — free spins every 6 hours.', 'long'),
    f('banners.1.ctaLabel', 'Button label', 'SPIN NOW'), f('banners.1.href', 'Button link', '/spinwheel', 'link'),
    f('banners.1.art', 'Picture', '/df-online/dragons/tier-fury.webp', 'image'),
  ] },
  { title: 'Banner slide 3 (built-in)', toggle: 'banner:refer', fields: [
    f('banners.2.kicker', 'Small heading', 'INVITE FRIENDS'), f('banners.2.title', 'Title', 'SHARE THE REWARDS'),
    f('banners.2.body', 'Text', 'Invite friends and earn on their first purchases.', 'long'),
    f('banners.2.ctaLabel', 'Button label', 'INVITE NOW'), f('banners.2.href', 'Button link', '/account/affiliate', 'link'),
    f('banners.2.art', 'Picture', '/df-online/dragons/tier-elder-dragon.webp', 'image'),
  ] },
  { title: 'Daily Rewards card', toggle: 'card:daily', fields: [
    f('promoCards.0.title', 'Title', 'DAILY REWARDS'), f('promoCards.0.subtitle', 'Text', 'Claim rewards every day!'),
    f('promoCards.0.ctaLabel', 'Button label', 'CLAIM NOW'), f('promoCards.0.href', 'Button link', '/daily-bonus', 'link'),
    f('promoCards.0.bg', 'Background picture', '/P1.png', 'image'),
  ] },
  { title: 'Spin the Wheel card', toggle: 'card:spin', fields: [
    f('promoCards.1.title', 'Title', 'Spin the Wheel'), f('promoCards.1.subtitle', 'Text', 'Win Gold and Sweep Coins'),
    f('promoCards.1.note', 'Small note', 'Get free-spins every 6 hours!'),
    f('promoCards.1.ctaLabel', 'Button label', 'SPIN'), f('promoCards.1.href', 'Button link', '/spinwheel', 'link'),
    f('promoCards.1.bg', 'Background picture', '/df-online/skyline.webp', 'image'),
  ] },
  { title: 'Recent Big Wins strip', toggle: 'panel:wins', fields: [f('recentWinsTitle', 'Heading', 'Recent Big Wins')] },
  { title: 'Available Packages row', toggle: 'panel:packages', fields: [
    f('packages.title', 'Heading', 'Available Packages'), f('packages.href', 'Link', '/store', 'link'),
  ] },
  { title: 'Providers strip', toggle: 'panel:providers', fields: [f('providers.title', 'Heading', 'Providers')], extra: 'providers' },
  { title: 'Invite friends panel', toggle: 'panel:invite', fields: [
    f('invite.kicker', 'Small heading', 'INVITE FRIENDS PROGRAM'), f('invite.title', 'Title', 'Share the Rewards!'),
    f('invite.body', 'Text before the number', 'Up to'), f('invite.highlight', 'Highlighted number', '10%'),
    f('invite.note', 'Note', 'of their first 3 purchases'), f('invite.ctaLabel', 'Button label', 'Copy Link'),
    f('invite.href', 'Button link', '/account/affiliate', 'link'), f('invite.art', 'Picture', '/df-online/dragons/tier-hatchling.webp', 'image'),
  ] },
  { title: 'Deals of the Day panel', toggle: 'panel:deals', fields: [
    f('deals.title', 'Heading', 'Deals of The Day'), f('deals.amount', 'Coins', '100,000'),
    f('deals.bonus', 'Bonus text', '10 FREE SC CASH'), f('deals.price', 'Price', '$9.50'),
    f('deals.ctaHref', 'Price button link', '/store', 'link'), f('deals.seeAllHref', '"See All" link', '/store', 'link'),
  ] },
  { title: 'Exclusive Platforms banner', toggle: 'panel:exclusive', fields: [
    f('exclusive.title', 'Heading', 'Exclusive Platforms'), f('exclusive.headline', 'Line 1', 'PLAY & WIN WITH'),
    f('exclusive.highlight', 'Line 2 (highlighted)', 'SWEEP COINS'), f('exclusive.href', 'Link', '/platform', 'link'),
    f('exclusive.art', 'Picture', '/df-online/dragons/tier-drake.webp', 'image'),
  ] },
  { title: 'Pick-for-me panel', toggle: 'panel:pick', fields: [
    f('pick.title', 'Title', "Can't decide what to play?"), f('pick.subtitle', 'Text', "We'll recommend a random game just for you."),
    f('pick.ctaLabel', 'Button label', 'Pick for me'),
  ] },
  { title: 'Top Winners panel', toggle: 'panel:winners', fields: [
    f('winners.titleLead', 'Title (first part)', 'Look at our'), f('winners.titleHighlight', 'Title (highlighted)', 'TOP WINNERS'),
    f('winners.columns.0.label', 'Column 1', 'Winnings per day'), f('winners.columns.1.label', 'Column 2', 'Winnings per month'),
    f('winners.columns.2.label', 'Column 3', 'Top X per month'), f('winners.showMoreLabel', '"Show more" button', 'Show More'),
  ] },
]

/** Category pills under the promo cards (and their labels). id '' = the Home pill. */
export const CATEGORY_PILLS = [
  { id: 'home', label: 'Home' }, { id: 'bingo', label: 'Bingo' }, { id: 'crash-game', label: 'Crash Game' },
  { id: 'fishing', label: 'Fishing' }, { id: 'instant-win', label: 'Instant Win' }, { id: 'keno', label: 'Keno' },
  { id: 'live-casino', label: 'Live Dealer' }, { id: 'lottery', label: 'Lottery' }, { id: 'scratch-cards', label: 'Scratch Cards' },
  { id: 'shooting', label: 'Shooting' }, { id: 'slots', label: 'Slots' }, { id: 'table-games', label: 'Table Games' },
  { id: 'virtual-game', label: 'Virtual Game' },
]

export const DEFAULT_PROVIDER_LOGOS = [
  { name: 'Pragmatic Play', image: '/providers/pragmatic.svg' }, { name: 'CQ9', image: '/providers/cq9.svg' },
  { name: 'Greentube', image: '/providers/greentube.svg' }, { name: 'Playtech', image: '/providers/playtech.svg' },
  { name: 'Quickspin', image: '/providers/quickspin.svg' }, { name: 'Spadegaming', image: '/providers/spadegaming.svg' },
  { name: 'Spribe', image: '/providers/spribe.svg' }, { name: 'Wazdan', image: '/providers/wazdan.svg' },
]

/* ---------------- sidebar and header ---------------- */
// group 'sidebar' / 'header': label saved under text['<group>.<id>'], hidden via off['<group>:<id>'].
export const SIDEBAR_ITEMS = [
  { section: 'Menu' },
  { id: 'promotions', label: 'Promotions' }, { id: 'install', label: 'Install App' }, { id: 'referral', label: 'Referral' },
  { id: 'vip', label: 'VIP' }, { id: 'favorites', label: 'Favorites' }, { id: 'tasks', label: 'Task List' },
  { id: 'faq', label: 'FAQ' }, { id: 'platforms', label: 'Platforms' },
  { section: 'Games group' },
  { id: 'games', label: 'Games (whole group)' },
  { id: 'bingo', label: 'Bingo' }, { id: 'crash-game', label: 'Crash Game' }, { id: 'fishing', label: 'Fishing' },
  { id: 'instant-win', label: 'Instant Win' }, { id: 'keno', label: 'Keno' }, { id: 'live-casino', label: 'Live Dealer' },
  { id: 'lottery', label: 'Lottery' }, { id: 'scratch-cards', label: 'Scratch Cards' }, { id: 'shooting', label: 'Shooting' },
  { id: 'slots', label: 'Slots' }, { id: 'table-games', label: 'Table Games' }, { id: 'virtual-game', label: 'Virtual Game' },
  { section: 'Bonuses group' },
  { id: 'bonuses', label: 'Bonuses (whole group)' },
  { id: 'spin', label: 'Spin the Wheel' }, { id: 'daily', label: 'Daily Rewards' }, { id: 'missions', label: 'Weekly Missions' },
  { section: 'Bottom' },
  { id: 'providers', label: 'Providers' }, { id: 'responsible', label: 'Responsible Gaming Policy' },
  { id: 'support', label: 'Support' }, { id: 'blog', label: 'Blog' }, { id: 'tutorial', label: 'Tutorial' },
  { id: 'logout', label: 'Logout' },
]

export const SIDEBAR_TEXT = [
  f('sidebar.logo', 'Sidebar logo', '/df-online/logo-512.webp', 'image'),
  f('sidebar.balance', 'Balance card title', 'Your Balance'),
  f('sidebar.buy', 'Buy button', 'Buy'),
  f('sidebar.redeemBtn', 'Redeem button', 'Redeem'),
  f('sidebar.vipLevel', 'VIP card title', 'VIP Level'),
  f('sidebar.referTitle', 'Guest referral title', 'Refer a Friend'),
  f('sidebar.referSub', 'Guest referral text', 'Earn free coins'),
]

export const HEADER_ITEMS = [
  { id: 'home', label: 'Home' }, { id: 'games', label: 'Games' }, { id: 'store', label: 'Store' },
  { id: 'redeem', label: 'Redeem' }, { id: 'bonus', label: 'Bonus (phone menu only)' },
  { id: 'promotions', label: 'Promotions' }, { id: 'spin', label: 'Spin' }, { id: 'refer', label: 'Refer' },
  { id: 'profile', label: 'Profile' }, { id: 'txns', label: 'Txns' }, { id: 'install', label: 'How to Install' },
  { id: 'blog', label: 'Blog posts' }, { id: 'support', label: 'Support (phone menu only)' },
]
