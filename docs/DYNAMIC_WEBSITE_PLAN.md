# DragonFury: making the website dynamic (frontend ↔ backend ↔ admin)

Audit date: 2026-10-12. Audit only, no code was changed. Rule: **no database structure changes**.
Local setup: Postgres `dragonfury_local` (same structure as `dragonfury_dev`), backend :8080, frontend :5173, admin :5174.

---

## 1. How the three apps already fit together

```
Admin (5174) --/api/admin/*--> Backend (8080) <--/api/*(public)-- Frontend (5173)
                                   |
                        Postgres: settings (key/value JSON) + per-store tables
```

- **A "store" is not a table.** A store is a `store_admin` user with a `store_code` (and `user_site_url`). Content for a store is saved in `settings` (key + store_code, value = JSON text) or in per-store tables (`blog_posts`, `footer_*`, `legal_pages`, `help_content`, `deposit_packages` ...).
- **Which store a visitor sees:** backend `publicHostStore.service.js` picks the store from `?store_code=`, else from the request host (default map: dragonfury.com / dragonfury.casino → `dragonfury`; any store's `user_site_url`), and `localhost` falls back to `dragonfury`.
- **Admin → website flow already works** for the features in section 2. Admin saves, backend stores in `settings`, the public endpoint serves it, and the frontend reads it with a hook.

## 2. Already dynamic (admin edits it → site shows it)

| Content | Admin screen | Public endpoint (verified 200 locally) | Frontend consumer |
|---|---|---|---|
| Homepage + casino slideshow images | Homepage pictures | `/api/dashboard-slideshow/public` → `slides`, `casinoSlides` | `useDashboardSlideshow` (home only) |
| Social links | Social media links | `/api/social-links/config` | `useStoreSocialLinks` |
| Which providers are on | Slot providers | `/api/slot-providers/config` | `useEnabledSlotProviders` |
| Deposit packages | Deposit packages | `/api/deposit-packages/public` | CasinoLobby, Deposit page |
| Landing payment links | Landing payment links | `/api/landing-payment-links/config` | `useLandingPaymentLinks` |
| Welcome bonus / deposit bonuses | Welcome signup bonus, Deposit bonuses | `/api/welcome-signup-bonus/public`, `/api/deposit-bonuses/public` | Home, overlays |
| Spin wheel, VIP, daily bonus, refer & earn | Spin wheel, VIP, Daily bonus, Refer & Earn | `/api/spinwheel/config` (+ authed APIs) | contexts / modals |
| Login popups | Login popups (promo modals) | `/api/dashboard-promo-modals` | `useDashboardPromoModals` |
| Blog | Pages → Blog | `/api/blog` | Blog pages |
| Help Center | Pages → Help Center | `/api/help` | Help page |
| Privacy / Terms / Responsible Gaming | Pages → each tab | `/api/legal/:key` | legal pages |
| Footer menus + custom pages, game SEO pages, page schema | Footer links, Blog → Home schema | `/api/footer`, `/api/game-pages`, page schema | footer, SEO pages |
| Winners feed | (data from play) | `/api/landing-winners/public` | landing |
| Users, wallet, KYC, tickets, geo-block | their admin screens | many authed APIs | Account pages |

## 3. Still static in the frontend (the new design you built)

| Part | Where it lives now | Dynamic status |
|---|---|---|
| Logged-in lobby banner carousel (6 images + links) | `config/casinoLobbyConfig.js → imageBanners` | **Static.** Admin "Homepage pictures" already supports desktop + mobile image + link per slide, but `CasinoLobby.jsx` does not read it (only `DashboardWelcome` does). Easiest win. |
| Daily Rewards / Spin promo cards (titles, images, CTA text) | `casinoLobbyConfig.js → promoCards` | Static texts and image URLs. Spin wheel *prizes* are dynamic, the card design is not. |
| Golden Dragon lobby sections (24 sections, 475 games) | `data/goldenLobby.json` | Static snapshot. No admin screen. Clicks launch only if the title matches the provider catalog. |
| Category pages / strip (`/category/:slug`) | `config/gameCategories.js` + provider catalog | Category list static (fine). Game lists come from the provider catalogs. |
| Providers strip, invite panel, deals, exclusive banner, "pick" and winners rows | `casinoLobbyConfig.js` | Static copy / images. |
| Sidebar rail items, Refer-a-Friend banner image | `DashboardSidebar.jsx` | Static UI. Fine to keep static. |
| FAQ page, Contact page | `pages/Faq`, `pages/Contact` (+ `site.js`) | **Static text in code.** Admin has no editor. |
| Brand: name, logo, support email, SEO defaults | `config/site.js` (env `VITE_*`) | Static per build. |
| Big-wins ticker rows | `BIG_WIN_ENTRIES` in code | Static sample data. |
| All Golden Dragon images (game icons, banners, wheel, sidebar) | hotlinked from `cdn.goldendragon.casino` | External dependency. Not yours; copy to your own storage before launch. |

## 4. What blocks "dynamic" right now (not code, setup)

1. **No store exists.** `dragonfury_local` has only the master admin. Public endpoints return empty data (`slides: []`, `groups: []`, `footer_menus: []`, `games: []`). Create a store in Admin → Stores (this creates a `store_admin` user row, no schema change).
2. **Store code mismatch.** `frontend/.env.local` has `VITE_STORE_CODE=skyline777`, but the plan is `dragonfury`. Pick one and use it in the frontend env, the store you create, and its User site URL.
3. **No game-provider credentials.** `backend/.env` has no GitSlotPark / Bona / 1GameHub / 568Win keys, so real game catalogs and game launch cannot work locally. `/api/games` returns an empty list.
4. **No image storage.** Admin image uploads use S3 (`AWS_S3_*` in `app.config.js`), which is not set. Until it is, paste public image URLs instead of uploading (check that each editor accepts a URL).
5. **Local host mapping.** `localhost` falls back to `dragonfury`, so with store code `dragonfury` the public APIs work without extra config. Another store code needs `PUBLIC_HOST_STORE_MAP` or `?store_code=`.

## 5. How to make the new design dynamic WITHOUT touching the database structure

The `settings` table is a generic key/value store (per store, `value` is text/JSON), and the project already uses it for slideshow, social links, VIP, etc. So new content can reuse it:

- **Level 1: connect what already exists (frontend only).** Make `CasinoLobby` read `/api/dashboard-slideshow/public` (use `casinoSlides`, fall back to the current 6 images when empty). Admin side needs no change.
- **Level 2: new content blocks in `settings` (small code in all three apps, zero migrations).** One new key per block, for example `lobby_promo_cards`, `lobby_sections`, `faq_content`, `contact_content`. Each needs: a backend public GET + admin PUT (copy the pattern of `socialLinks` / `dashboardPromoModals`), an admin editor (we can add it as a tab under **Pages**), and a frontend hook with a fallback to today's static config. Order: FAQ and Contact (text, easy) → promo cards → lobby sections (move `goldenLobby.json` shape into a setting).
- **Not realistic without code and a real provider:** live game catalogs and launch (needs provider credentials) and anything that needs a new table (per-game stats, scheduling, versioning).

## 6. Recommended order of work

1. Setup: create the `dragonfury` store, set `VITE_STORE_CODE=dragonfury`, restart the frontend, create a store admin login, add provider credentials when available.
2. Fill the existing admin screens and confirm each shows on the site (use the table in section 2 as the checklist).
3. Level 1: lobby banners from "Homepage pictures".
4. Level 2: FAQ → Contact → promo cards → lobby sections.
5. Move images off `cdn.goldendragon.casino` into your own storage (or an admin setting).
6. Before launch: verify guest vs logged-in views, mobile, and that every static fallback still works when the API returns empty.

## 7. Open questions for you

- Which store code is final (`dragonfury` or `skyline777`)?
- Do you have game-provider credentials (GitSlotPark, Bona, 1GameHub, 568Win) and an S3 bucket / image host?
- Should the lobby sections (Bingo, Slots, Top 10 ...) be fully editable by admin, or only turned on/off per provider?
