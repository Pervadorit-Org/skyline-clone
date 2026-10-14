/**
 * Mirror of the website's built-in footer (frontend/src/config/footerConfig.js),
 * so the editor shows what the site shows today. Saving writes the full object;
 * "Reset to default" clears the store's row and the site falls back to its built-ins.
 */
const ICONIFY = 'https://api.iconify.design'

export const FOOTER_DEFAULTS = {
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

  brand: { logo: '', text: '' },

  platforms: { title: 'Platforms', max: 14, items: [] },

  pages: {
    title: 'Pages',
    includeCmsPages: true,
    items: [
      { label: 'Blog', href: '/blog' },
      { label: 'Help Center', href: '/help' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms & Conditions', href: '/terms' },
      { label: 'Responsible Gaming', href: '/responsible-gaming' },
      { label: 'Bonuses', href: '/bonus' },
    ],
  },

  contact: {
    title: 'Contact',
    email: '',
    chatLabel: 'Chat Now',
    socials: { instagram: '', twitter: '', facebook: '', discord: '' },
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
}

/** Left-hand tab list: key -> label, in display order. */
export const SECTION_ORDER = ['payments', 'brand', 'platforms', 'pages', 'contact', 'compliance']

export const SECTION_LABELS = {
  payments: 'Payment icons',
  brand: 'Logo & about text',
  platforms: 'Platforms links',
  pages: 'Pages links',
  contact: 'Contact & social',
  compliance: 'Legal notes & copyright',
}
