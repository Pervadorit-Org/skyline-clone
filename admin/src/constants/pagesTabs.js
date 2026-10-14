/**
 * The admin "Pages" screens, split by who sees them on the website:
 *   guest  – visitors who are not signed in (home, footer, legal pages, blog, help…)
 *   user   – signed-in players (the lobby: banners, game rows, sidebar, header…)
 * Used by the Pages screen (tab strip) and the admin sidebar (Pages dropdown).
 *
 * `needs` is the admin screen whose permission gates the tab. `kind` picks the editor.
 * Lobby tabs share one editor; `section` is the part of it they open.
 */
export const AUDIENCES = [
  { key: 'guest', label: 'Guest users', hint: 'Before login' },
  { key: 'user', label: 'Logged-in users', hint: 'After login' },
]

export const PAGE_TABS = [
  { key: 'home', label: 'Home Page', path: '/', kind: 'home', audience: 'guest', needs: '/dashboard-slideshow' },
  { key: 'footer', label: 'Footer', path: '/', kind: 'footer', audience: 'guest', needs: '/footer' },
  { key: 'blog', label: 'Blog', path: '/blog', kind: 'blog', audience: 'guest', needs: '/blog' },
  { key: 'help', label: 'Help Center', path: '/help', kind: 'help', audience: 'guest', needs: '/help' },
  {
    key: 'faq', label: 'FAQ', path: '/faq', kind: 'info', audience: 'guest',
    summary: 'Frequently Asked Questions page.',
    related: ['/help', '/support-tickets', '/footer'],
  },
  { key: 'about-us', label: 'About Us', path: '/about-us', kind: 'legal', audience: 'guest', needs: '/footer' },
  { key: 'privacy', label: 'Privacy Policy', path: '/privacy', kind: 'legal', audience: 'guest', needs: '/footer' },
  { key: 'terms', label: 'Terms & Conditions', path: '/terms', kind: 'legal', audience: 'guest', needs: '/footer' },
  { key: 'bonus-terms', label: 'Bonus Terms', path: '/bonus-terms', kind: 'legal', audience: 'guest', needs: '/footer' },
  { key: 'sweep-policy', label: 'Sweep Policy', path: '/sweep-policy', kind: 'legal', audience: 'guest', needs: '/footer' },
  { key: 'responsible-gaming', label: 'Responsible Gambling', path: '/responsible-gaming', kind: 'legal', audience: 'guest', needs: '/footer' },
  { key: 'amoe', label: 'AMOE', path: '/amoe', kind: 'legal', audience: 'guest', needs: '/footer' },
  { key: 'aml-cft-policy', label: 'AML/CFT Policy', path: '/aml-cft-policy', kind: 'legal', audience: 'guest', needs: '/footer' },
  { key: 'cookie-policy', label: 'Cookie Policy', path: '/cookie-policy', kind: 'legal', audience: 'guest', needs: '/footer' },
  { key: 'ssl-encryption', label: 'SSL Encryption', path: '/ssl-encryption', kind: 'legal', audience: 'guest', needs: '/footer' },
  { key: 'contact-us', label: 'Contact Us', path: '/contact', kind: 'legal', audience: 'guest', needs: '/footer' },
  { key: 'bonuses', label: 'Bonuses', path: '/bonus', kind: 'bonuses', audience: 'guest' },

  { key: 'lobby-banners', label: 'Banners', path: '/casino', kind: 'lobby', section: 'banners', audience: 'user', needs: '/dashboard-slideshow' },
  { key: 'lobby-rows', label: 'Game rows', path: '/casino', kind: 'lobby', section: 'rows', audience: 'user', needs: '/dashboard-slideshow' },
  { key: 'lobby-popular', label: 'Popular games (Top 10)', path: '/casino', kind: 'lobby', section: 'popular', audience: 'user', needs: '/dashboard-slideshow' },
  { key: 'lobby-cards', label: 'Cards, panels & text', path: '/casino', kind: 'lobby', section: 'cards', audience: 'user', needs: '/dashboard-slideshow' },
  { key: 'lobby-sidebar', label: 'Sidebar menu', path: '/casino', kind: 'lobby', section: 'sidebar', audience: 'user', needs: '/dashboard-slideshow' },
  { key: 'lobby-header', label: 'Header menu', path: '/casino', kind: 'lobby', section: 'header', audience: 'user', needs: '/dashboard-slideshow' },
  { key: 'lobby-hidden', label: 'Hidden games', path: '/casino', kind: 'lobby', section: 'hidden', audience: 'user', needs: '/dashboard-slideshow' },
]

/** Old links (?tab=lobby) keep working. */
export const TAB_ALIASES = { lobby: 'lobby-banners' }

export const tabsForAllowed = (allowed) => PAGE_TABS.filter((t) => !t.needs || allowed.has(t.needs))
