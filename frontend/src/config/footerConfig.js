/**
 * Built-in footer content. These are exactly the values the footer showed before
 * it became admin-managed, so an empty/missing admin row looks identical to today.
 * The admin (Pages → Footer) stores only what it changes in the `footer_content`
 * settings row; `mergeFooterConfig` lays that over these defaults (arrays replace,
 * missing keys keep the default).
 *
 * Text fields may use: {platform} {year} tokens, **bold**, and [label](/path) links.
 */
const ICONIFY = 'https://api.iconify.design';

export const defaultFooterConfig = {
  // Which footer blocks are visible.
  show: { payments: true, brand: true, platforms: true, pages: true, contact: true, compliance: true },

  payments: {
    title: 'Accepted payment methods',
    items: [
      { name: 'Visa', image: `${ICONIFY}/logos/visa.svg` },
      { name: 'Mastercard', image: `${ICONIFY}/logos/mastercard.svg` },
      { name: 'Cash App', image: '/df-online/pay/cash-app.svg' },
      { name: 'Chime', image: `${ICONIFY}/thesvg-color/chime-dark.svg` },
      { name: 'Google Pay', image: `${ICONIFY}/logos/google-pay.svg` },
      { name: 'Apple Pay', image: `${ICONIFY}/logos/apple-pay.svg` },
      { name: 'Bitcoin', image: `${ICONIFY}/logos/bitcoin.svg` },
      { name: 'USDT', image: `${ICONIFY}/token-branded/usdt.svg` },
      { name: 'Bank transfer', image: `${ICONIFY}/mdi/bank.svg?color=%23bebebe` },
    ],
  },

  brand: {
    logo: '', // empty = the built-in site logo
    text: '', // empty = the site's SEO description
  },

  platforms: {
    title: 'Platforms',
    max: 14,
    items: [], // empty = automatic (game pages, else featured platforms)
  },

  pages: {
    title: 'Pages',
    includeCmsPages: true, // also list pages created in admin "Footer links"
    items: [
      { label: 'Blog', href: '/blog' },
      { label: 'Help Center', href: '/help' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms & Conditions', href: '/terms' },
      { label: 'Responsible Gaming', href: '/responsible-gaming' },
    ],
  },

  contact: {
    title: 'Contact',
    email: '', // empty = the site's support email
    chatLabel: 'Chat Now',
    socials: { instagram: '', twitter: '', facebook: '', discord: '' }, // empty = site/env setting
  },

  compliance: {
    notes: [
      'NO PURCHASE REQUIRED to participate in the sweepstakes. Sweepstakes are VOID WHERE PROHIBITED BY LAW. Please refer to the [Terms and Conditions](/terms).',
      '© {year} {platform}. We maintain full AML and KYC compliance, ensuring player identity and transactions are verified for safety and integrity. For details, please review our [Privacy Policy](/privacy).',
      'Individuals under the age of 18 are strictly prohibited from creating an account or participating in any games offered on this platform.',
      '**Disclaimer.** {platform} is a website for playing supported games. All game titles, logos, characters, artwork and other elements shown on this site are the material and property of their respective third-party owners and are used for identification only.',
    ],
    copyright: '© {year} {platform}. All Rights Reserved.',
  },
};

const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v);

function deepMerge(base, over) {
  if (Array.isArray(over)) return over;
  if (isPlainObject(over) && isPlainObject(base)) {
    const out = { ...base };
    for (const k of Object.keys(over)) out[k] = deepMerge(base[k], over[k]);
    return out;
  }
  return over === undefined ? base : over;
}

/** Admin content laid over the built-in defaults. */
export function mergeFooterConfig(saved) {
  if (!isPlainObject(saved)) return defaultFooterConfig;
  return deepMerge(defaultFooterConfig, saved);
}
