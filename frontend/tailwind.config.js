/**
 * Tailwind CSS v3 – color palette (Skyline777-matched red/gold casino theme).
 * Use: bg-app, bg-card, bg-input, text-muted, text-primary, bg-primary, border-gray-*,
 * plus theme-red/theme-yellow/theme-gold/theme-green/navbar/card-* tokens below.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Legacy tokens — repointed from lime-green to the new gold accent so
        // existing bg-primary/text-primary usages flow into the new palette.
        app: '#0b0b0f',
        card: '#0d0d18',
        input: '#1b1420',
        muted: '#9b9b9f',
        primary: '#f3c10f',

        // Skyline777 theme tokens
        'theme-red': '#b11ce3',
        'theme-red-dark': '#b220e3',
        'theme-red2': '#a51ad4',
        'theme-yellow': '#f3c10f',
        'theme-yellow2': '#d1973e',
        'theme-yellow3': '#f0d53e',
        'theme-gold': '#ffd400',
        'theme-green': '#44e644',
        'theme-green2': '#a8e644',
        'theme-green3': '#d5ff2e',
        'theme-green4': '#3cff42',
        'theme-green5': '#1a8e0d',
        'theme-orange': '#b529e4',

        background: '#0b0b0f',
        'background-dark': '#130e2c',
        'background-light': '#231d43',
        navbar: '#111118',
        'navbar-light': '#272631',
        'card-border': '#272631',
        'card-button-dark': '#1c1c23',
        'card-background': '#0b0b0e',
        'card-dark': '#0d0d18',
      },
      maxWidth: {
        content: '1200px',
      },
    },
  },
  plugins: [],
};
