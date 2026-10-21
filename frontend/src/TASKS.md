# DragonFury frontend: Golden Dragon restyle, task log

Goal: make the DragonFury casino frontend look and behave like the Golden Dragon reference site.
Status: all tasks below are implemented and browser-checked (Vite dev server, port 5173). Nothing is committed yet.

---

## A. Completed tasks

### 1. Guest dashboard shell on non-home pages
- A guest on `/casino`, `/category/*` etc. now sees the signed-in dashboard shell (icon rail, dark header, games data).
- Login-gated features (account, tasks, logout-type items) open the login page/modal instead.
- Files: `components/Layout.jsx` (`isGuest`, `isGuestLanding`, `isGuestShell`, `df-ref-shell` body class), `components/SpinzySidebar.jsx` (`showGuestRail`, IconRail `isGuest`), `components/Navbar.jsx`.

### 2. Guest header: logo and Login / Sign Up buttons
- Guest logo visible (links to `/casino`) and enlarged to 46px.
- Fixed overlapping Login/Sign Up buttons (landing styles leaking into the shell).
- Files: `components/Navbar.jsx`, `styles/ref-shell.css` (scoped block).

### 3. Guest app-sidebar: "Refer a Friend" banner
- Guests see the "Refer a Friend / Earn free coins" banner instead of the balance and VIP points cards.
- Signed-in users still see the balance + VIP cards.
- Files: `components/Home/DashboardSidebar.jsx`, `styles/dashboard-sidebar.css` (`.dgs__refer*`).

### 4. Help launcher and sound control
- Purple HELP bubble replaced by a round headset button (bottom-right).
- Sound/BGM control moved to the bottom-right dock next to it.
- Files: `components/Home/DragonFuryHelpLauncher.jsx`, `styles/ref-shell.css` (`--df-fab-size:56px` dock).

### 5. Support messenger (Intercom-style)
- The headset opens a messenger with Home / Messages / Help tabs, social links from `site.socialLinks`, a help-topic list, Esc to close, and a hand-off to the real Intercom chat.
- Files: `components/IntercomWidget.jsx`, `components/intercom-widget.css`.

### 6. Category pages: `/category/:slug`
- Slugs: bingo, crash-game, fishing, instant-win, keno, live-dealer, lottery, scratch-cards, shooting, slots, table-games, virtual-game.
- Page layout: category strip, gold title, search box, game grid.
- `/category` redirects to `/casino`; `AllSlotGames` redirects known categories; lobby tabs and sidebar game links use `getGameCategoryPath`.
- Files: `config/gameCategories.js`, `hooks/useCategoryPageGames.js`, `pages/Category/CategoryPage.jsx`, `styles/category-page.css`, `utils/slotLobbyGames.js` (`buildCategoryPageGames`), `App.jsx`, `pages/SlotGames/AllSlotGames.jsx`, `components/Casino/CasinoLobby.jsx`, `config/casinoLobbyConfig.js`, `public/df-online/club-icons/virtual.svg`.

### 7. Sound popup re-theme
- Popup restyled to the dark + gold theme (`#14151f` / `#1a1b2b` / `#ebc567`, Montserrat).
- File: `components/BackgroundMusic.css`.

### 8. Logged-in lobby banner images
- The front banner carousel uses the 6 supplied images (separate mobile and desktop URLs) when logged in, each with its own link (/store, /daily-bonus, /spinwheel, /account/affiliate, /account/vip, Facebook).
- Files: `config/casinoLobbyConfig.js` (`imageBanners`), `components/Casino/CasinoLobby.jsx` (`BannerSlideImage`, `BannerCarousel`), `styles/casino-lobby.css`.

### 9. Daily Rewards and Spin promo cards
- Wheel segments and outer-ring images added, then the full card restyled from the supplied HTML (title, gold CTA, silver chip, note, 6s wheel wobble).
- Two columns only at 1200px and wider, with smaller mobile title and wheel sizes.
- Files: `config/casinoLobbyConfig.js` (`promoCards`, `wheel`), `components/Casino/CasinoLobby.jsx`, `styles/casino-lobby.css`.

### 10. Signed-in app sidebar matches Golden Dragon
- Balance card (2px gradient ring, orange ribbon, 36px pills) and VIP card restyled; Buy/Redeem rims; vault and coin images from the Golden Dragon CDN.
- Icon rail hidden at 767px and below.
- Files: `components/Home/DashboardSidebar.jsx`, `styles/dashboard-sidebar.css`.

### 11. Golden Dragon lobby sections from JSON, shown after login
- Scraped the reference lobby into `data/goldenLobby.json`: 24 sections, 475 games (title, image, play ID, mosaic grid positions).
- `components/Casino/GoldenLobbySections.jsx` renders them; `styles/golden-lobby.css` styles them.
- Section types: featured provider banners with parallax art (BGaming, Net Gaming, GD Best, 18 Peaches), category rows (Bingo ... Table Games), mosaics (Dragon Best, Arcade, Trending, Top Games, Jackpot Zone, After Dark, Jokes), New Games grid, Top 10 and Top 10 Fish with outlined numerals.
- Shown on `/` and `/casino` for signed-in users; guests keep the old sign-in gate. Packages, Invite Friends, Providers and Exclusive panels are inserted at the same positions as the reference through `renderLobbyInsert`.

---

## B. Still to do / known issues

1. **Game launch is unverified.** Clicking a card looks up the title in the provider catalog (`getAllCachedProviderSlotGames`). With no backend running it only showed the toast "<title> isn't available to launch right now." Test again with the backend up; titles your providers don't carry will keep showing that toast.
2. **Images are hotlinked from `cdn.goldendragon.casino`**. This covers about 475 game icons, banners, wheel images, vault/coin images and section icons. Download them into `public/` and update the paths before launch, because they break if that site changes or blocks hotlinking.
3. **`goldenLobby.json` is a static snapshot.** Re-scrape it if the reference lobby changes.
4. **Leftover unused code** in `components/Casino/CasinoLobby.jsx`: `CategoryRow` and `iconFor`. Remove them.
5. **Lint:** ESLint reports "Parsing error: Unexpected token <" on every JSX file (config issue, not caused by these changes). Fix the ESLint config.
6. **Nothing is committed.** Changed files are shown by `git status` on `main`; commit or open a PR when ready.

---

## C. Suggested next steps
- Host all Golden Dragon images locally.
- Map lobby entries to real game IDs from your own catalog, so clicks launch reliably.
- Check the phone-width layout (375px) once more for every new section after the backend is running.
