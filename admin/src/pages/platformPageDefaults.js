/**
 * Built-in content of /platform-games/:slug, mirrored from the website
 * (frontend/src/config/platformPageDefaults.js) so the editor shows what the page
 * shows when nothing was saved. Saved values replace these.
 */
export function defaultPlatformContent(name) {
  const n = String(name || 'This game').trim()
  return {
    overlayImage: '',
    playTitle: `Play ${n} Online`,
    downloadTitle: `Download Links for ${n}`,
    featureTitle: `${n} Feature`,
    playButton: { label: 'Play', url: '/register' },
    downloadButton: { label: 'Download', url: '/platform' },
    journey: {
      title: `Your ${n} Journey Starts Right Here.`,
      intro: `Getting started with ${n} takes less than two minutes. Here's how:`,
      steps: [
        'Login or Sign Up',
        'Pick Your Device & Play Apple or Android. Enter your account details, and follow the on-screen instructions.',
      ],
    },
    setup: {
      title: 'SETTING UP YOUR ACCOUNT',
      lines: [
        'Visit the website and hit Sign Up to get started.',
        'Fill out the registration form with your personal details and submit.',
        'Your account credentials will arrive shortly by text or email.',
        'Once received, tap your device: iPhone, Android, PC, or Mac.',
        `Download the ${n} app or play instantly in your browser.`,
        'Enter your login details, follow the on-screen instructions, and start playing.',
      ],
    },
    tips: {
      title: `TIPS TO PLAY ${n.toUpperCase()}`,
      lines: [
        'Learn the game library first, slots, fish games, and table games; each rewards different skills.',
        'In fish shooting games, aim for high-value targets and skip low-value catches entirely.',
        'Chase progressive jackpots on slots; they keep climbing until someone hits them.',
        'Use the demo version to practice new games before going all in with real money.',
        'Collect your welcome bonus, weekly bonus, and monthly bonus without fail every session.',
      ],
    },
  }
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v)

/** Saved `sections.platform` over the defaults (a key never saved keeps the default). */
export function mergePlatformContent(name, saved) {
  const base = defaultPlatformContent(name)
  if (!isObj(saved)) return base
  const out = { ...base }
  ;['overlayImage', 'playTitle', 'downloadTitle', 'featureTitle'].forEach((k) => {
    if (typeof saved[k] === 'string') out[k] = saved[k]
  })
  ;['playButton', 'downloadButton'].forEach((k) => {
    if (isObj(saved[k])) out[k] = { ...base[k], ...saved[k] }
  })
  if (isObj(saved.journey)) out.journey = { ...base.journey, ...saved.journey }
  if (isObj(saved.setup)) out.setup = { ...base.setup, ...saved.setup }
  if (isObj(saved.tips)) out.tips = { ...base.tips, ...saved.tips }
  return out
}
