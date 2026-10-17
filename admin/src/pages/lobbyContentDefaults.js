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
  faq: { intro: '', sections: [] },
  tasks: { regular: [], daily: [] },
  promoCards: [],
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

/* Built-in FAQ / task list / promotion cards, used as the starting point in the editors. */
export const FAQ_DEFAULT_SECTIONS = [
  {
    "title": "Account & Registration",
    "items": [
      {
        "q": "How do I create an account?",
        "a": "Click Sign Up, enter your details, accept the Terms & Conditions and verify your email address."
      },
      {
        "q": "Who can register?",
        "a": "You must meet the minimum age requirement in the Terms & Conditions and live in an eligible location. One account per person."
      },
      {
        "q": "Can I have more than one account?",
        "a": "No. Duplicate or shared accounts are not allowed and may be suspended."
      },
      {
        "q": "How do I update my profile details?",
        "a": "Go to Profile, edit your information and save. Some changes may require verification."
      }
    ]
  },
  {
    "title": "Login and Security",
    "items": [
      {
        "q": "How do I log in?",
        "a": "Click Login, enter your registered username or email and password, and click Log In."
      },
      {
        "q": "I forgot my password. What should I do?",
        "a": "Click Forgot Password? on the Login page and follow the instructions to reset your password."
      },
      {
        "q": "How do I change my password?",
        "a": "Go to Profile → Change Password, enter your current password and new password, and click Update Password."
      },
      {
        "q": "What should I do if I think someone accessed my account?",
        "a": "Change your password immediately and contact Customer Support if you notice any unusual activity."
      },
      {
        "q": "Should I share my password with Customer Support?",
        "a": "No. Never share your password with anyone, including Customer Support."
      }
    ]
  },
  {
    "title": "Gold Coins (GC) & Sweepstakes Coins (SC)",
    "items": [
      {
        "q": "What are Gold Coins?",
        "a": "Gold Coins are for entertainment only and have no redemption value."
      },
      {
        "q": "What are Sweepstakes Coins?",
        "a": "Sweepstakes Coins may be redeemable for prizes, subject to the Official Rules."
      },
      {
        "q": "How do I get free Sweepstakes Coins?",
        "a": "Through the welcome bundle, daily rewards, promotions, or the Alternate Method of Entry (AMOE). No purchase is required."
      },
      {
        "q": "Does buying more coins improve my chances?",
        "a": "No. Purchases don't affect outcomes. All games use randomized results."
      }
    ]
  },
  {
    "title": "Store & Purchases",
    "items": [
      {
        "q": "Is a purchase required to play?",
        "a": "No purchase is necessary. Optional coin packages are available in the Store."
      },
      {
        "q": "Where do I buy coin packages?",
        "a": "Open the Store from the top bar and choose a package."
      },
      {
        "q": "My purchase did not arrive. What should I do?",
        "a": "Wait a few minutes and refresh. If the coins still do not appear, contact Customer Support with your order details."
      }
    ]
  },
  {
    "title": "Payments",
    "items": [
      {
        "q": "Which payment methods are accepted?",
        "a": "Available methods are shown at checkout and may vary by location."
      },
      {
        "q": "Is my payment information safe?",
        "a": "Payments are processed by secure third-party processors. We do not store full card details."
      },
      {
        "q": "Can I get a refund?",
        "a": "Refund eligibility is described in the Terms & Conditions. Contact Customer Support for help with a specific order."
      }
    ]
  },
  {
    "title": "Redeeming Sweepstakes Coins",
    "items": [
      {
        "q": "How does redemption work?",
        "a": "Eligible Sweepstakes Coin balances may be submitted for redemption, subject to verification and the platform's Official Rules."
      },
      {
        "q": "Do I need to verify my identity?",
        "a": "Yes. ID verification may be required before a redemption is approved."
      },
      {
        "q": "How long does a redemption take?",
        "a": "Timing depends on verification and processor windows. You can track the status in your account."
      }
    ]
  },
  {
    "title": "Bonuses & Promotions",
    "items": [
      {
        "q": "What bonuses are available?",
        "a": "Welcome bundles, daily rewards, the spin wheel, VIP rewards and referral bonuses. See the Promotions page for current offers."
      },
      {
        "q": "How do VIP rewards work?",
        "a": "You earn VIP Points by playing and move up ranks to unlock bigger rewards."
      },
      {
        "q": "How does the referral program work?",
        "a": "Share your referral link. When a friend signs up and meets the requirements, you both get rewarded."
      }
    ]
  },
  {
    "title": "Responsible Play & Support",
    "items": [
      {
        "q": "How can I limit my play?",
        "a": "Contact Customer Support to set limits or to take a break from the platform."
      },
      {
        "q": "How do I contact support?",
        "a": "Use the Chat button in the corner of the screen or email our support team."
      }
    ]
  }
]

export const FAQ_DEFAULT_INTRO =
  'is a free-to-play online platform that runs in two modes: Gold Coins for fun play and Sweepstakes Coins for prize redemptions.'

export const TASK_DEFAULTS = {
  regular: [
    { id: 'fb', title: 'Click Link', desc: 'Follow us on Facebook', target: 'Visit the link', social: 'facebook', gc: '1,000', sc: '0.2' },
    { id: 'x', title: 'Click Link', desc: 'Follow us on X', target: 'Visit the link', social: 'twitter', gc: '10,000', sc: '0.2' },
    { id: 'phone', title: 'Verify Phone', desc: 'Verify Your Phone Number and get rewards', target: 'Verify your phone number', action: 'phone', gc: '10,000', sc: '0.5' },
    { id: 'ig', title: 'Click Link', desc: 'Follow us on Instagram', target: 'Visit the link', social: 'instagram', gc: '10,000', sc: '0.2' },
    { id: 'dc', title: 'Click Link', desc: 'Join our Discord community', target: 'Visit the link', social: 'discord', gc: '10,000', sc: '0.2' },
    { id: 'email', title: 'Setup Email Address', desc: 'Add and verify your email address', target: 'Set up your email address', action: 'email', gc: '100', sc: '1' },
  ],
  daily: [
    { id: 'purchase', title: 'Purchase Package', desc: 'Purchase a package worth $30 and get rewards.', target: 'Purchase a package worth $30', to: '/store', cta: 'Visit Store', gc: '50,000', sc: '1' },
    { id: 'referral', title: 'Referral Completed', desc: 'Refer a friend and earn bonus.', target: 'Refer a friend', to: '/account/affiliate', cta: 'Invite Friends', gc: '10,000', sc: '0.5' },
    { id: 'active', title: 'Stay Active', desc: '', target: 'Log in and stay active today', gc: '1,000', sc: '0.1' },
    { id: 'play', title: 'Play Games', desc: 'Play 5 games today', target: 'Play 5 games today', to: '/casino', cta: 'Play Games', gc: '2,500', sc: '0.25' },
  ],
}

/** Promotions page cards. `fields` = which boxes the editor shows for that card design. */
export const PROMO_CARD_DEFAULTS = [
  { id: 'vip', label: 'VIP club card', ribbon: 'Free', badge: 'VIP CLUB MEMBERS ONLY', text: 'Get max rewards.', gold: '200,000', sweep: '20', cta: 'Get NOW $19.99', to: '/store', fields: ['ribbon', 'badge', 'text', 'gold', 'sweep', 'cta', 'to'] },
  { id: 'welcome', label: 'Welcome bundle card', badge: 'EXCLUSIVE WELCOME BUNDLE', text: 'UP TO', gold: '900,000', sweep: '30', cta: 'SHOW MORE', to: '/store', note: 'was $30.00', fields: ['badge', 'text', 'gold', 'sweep', 'cta', 'to', 'note'] },
  { id: 'key', label: 'Key to the city card', badge: 'BEST DEAL - 200% EXTRA COINS', text: 'KEY TO THE CITY', cta: 'BUY NOW $24.99', to: '/store', fields: ['badge', 'text', 'cta', 'to'] },
  { id: 'express', label: 'Special offer card', badge: 'MOST POPULAR - 350% EXTRA COINS', text: 'Your Special Offer', cta: 'BUY NOW $7.99', to: '/store', fields: ['badge', 'text', 'cta', 'to'] },
  { id: 'invite', label: 'Invite friends card', badge: 'INVITE FRIENDS PROGRAM', text: 'Share the Rewards!', cta: 'Copy Link', fields: ['badge', 'text', 'cta'] },
  { id: 'daily', label: 'Daily express card', badge: 'DAILY EXPRESS', text: 'Claim Rewards Every Day!', cta: 'CLAIM REWARD', to: '/daily-bonus', fields: ['badge', 'text', 'cta', 'to'] },
]

/** Store popup (Buy / Redeem / Bonus): every word is optional; empty keeps the built-in text. */
export const STORE_TAB_ITEMS = [
  { id: 'buy', label: 'Buy (always shown)' }, { id: 'redeem', label: 'Redeem' }, { id: 'bonus', label: 'Bonus' },
]

export const STORE_TEXT_GROUPS = [
  { title: 'Popup', fields: [f('store.title', 'Popup title', 'Store')] },
  {
    title: 'Buy: welcome offer',
    note: 'The welcome chests come from the “Welcome Packages” group in Deposit packages. The ribbon picture has “Get Upto 300% more” drawn on it: upload your own picture, or switch the ribbon off under Sections below if that claim is not true for your offers.',
    fields: [
      f('store.welcomeTitle', 'Heading', "Haven't Claimed Your Welcome Offer Yet"),
      f('store.welcomeSub', 'Sub heading', 'Choose Wisely - you can only pick one'),
      f('store.welcomeBadge', 'Welcome ribbon picture (empty = built-in “Get Upto 300% more” ribbon)', '', 'image'),
    ],
  },
  {
    title: 'Buy: limited offers',
    note: 'Daily Deals shows the “Flash Sale” group and Weekly Deals shows the “Limited Time Offers” group. Both come from Deposit packages. Set an end time on the group to control the countdown; with none set, Daily counts down to the end of the day and Weekly to the end of the week (UTC).',
    fields: [
      f('store.limitedTitle', 'Banner title', 'Limited Offer'),
      f('store.limitedSub', 'Banner text', "Don't miss out - these go fast!"),
      f('store.dailyTitle', 'Daily deals title', 'Daily Deals'),
      f('store.weeklyTitle', 'Weekly deals title', 'Weekly Deals'),
    ],
  },
  {
    title: 'Redeem tab',
    note: 'Balances, the daily payout limit and the redeem rules come from the player’s wallet and the wallet limits — they are not typed here.',
    fields: [
      f('store.redeemIntro', 'Intro text', 'Sweepstakes Coins can be redeemed for real cash. Sweepstakes Coins must be played at least once before they can be redeemed.', 'long'),
      f('store.redeemBalance', 'Balance label', 'Sweepstakes Coins Balance'),
      f('store.redeemUnplayed', 'Unplayed label', 'Unplayed'),
      f('store.redeemRedeemable', 'Redeemable label', 'Redeemable'),
      f('store.payoutTitle', 'Payout card title', 'Payout'),
    ],
  },
  {
    title: 'Bonus tab',
    note: 'Codes are checked by the existing apply-code service; the popup only shows what that service answers.',
    fields: [
      f('store.bonusTitle', 'Title', 'Enter Promo Code'),
      f('store.bonusSub', 'Text under the title', 'Unlock exclusive rewards and bonuses with your promo code.', 'long'),
      f('store.bonusStep1', 'Step 1', 'Enter your promo code in the field above'),
      f('store.bonusStep2', 'Step 2', 'Click "Apply Promo Code" to submit'),
      f('store.bonusStep3', 'Step 3', 'If valid, it is applied to your next purchase'),
      f('store.bonusStep4', 'Step 4', 'Offers may include discounts or special terms'),
    ],
  },
]

/** Switchable parts of the Store popup (stored in the lobby `off` list as store:<id>). */
export const STORE_SECTIONS = [
  { id: 'welcome', label: 'Welcome offer chests', hint: 'From the “Welcome Packages” group.' },
  { id: 'ribbon', label: 'Welcome ribbon picture', hint: 'The pink “Get Upto … more” badge beside the heading.' },
  { id: 'limited', label: 'Limited offer banner + Daily/Weekly deals', hint: 'Switches both deal boxes off.' },
  { id: 'daily', label: 'Daily Deals box', hint: 'From the “Flash Sale” group (its end time drives the countdown).' },
  { id: 'weekly', label: 'Weekly Deals box', hint: 'From the “Limited Time Offers” group (its end time drives the countdown).' },
  { id: 'grid', label: 'Package grid', hint: 'From the “Featured” and “General” groups.' },
]
