# Guest Home Page (`/`): plan to make it admin-managed

Status: **plan only, no code changed.** Rules agreed: no new database table (a table is created only after you give permission), admin must be able to update the home page through the admin panel.

---

## 1. Where the home page content comes from today

The guest home page (`pages/Home/index.jsx` → `HomeV2`) is built from **one file: `frontend/src/config/homeConfig.js`**. The 13 sections under `components/Home/Home2/` make **no API call at all**. Every text, image, link, order and on/off switch is hardcoded in that file. So today the admin cannot change anything on the home page except the items listed in section 4.

## 2. Where admin edits will be stored (no new table)

- The backend already has a generic `settings` table (key + `store_code` + JSON text value). Slideshow, social links, VIP and others already use it.
- Plan: **one new settings key, `home_page_content`, per store.** This adds a row, not a table or a column. **No database structure change.**
- Needs backend code only (a public GET endpoint and an admin save endpoint, same pattern as `social-links`), plus an admin screen and a frontend hook.
- **If we ever need a real table (for example version history of edits), I will ask you first.** It is not needed for this plan.

Safety rule: the frontend merges the admin values **over the current `homeConfig.js` defaults**. A field the admin leaves empty keeps today's text/image, and if the API is down the page still shows today's design.

## 3. Admin screen: how the admin will see it

New tab **Home** in the existing **Pages** screen (the tab bar already built), plus a store selector for master admin.

- One collapsible card per section, **in the same order as on the website**, each with: on/off switch, the fields below, "Save", "Reset to default".
- Up/down arrows to reorder sections.
- "View live page" link, and a small note under each image showing the recommended size.
- Image fields: **Upload** (needs S3, see section 7) or **paste an image URL**.

## 4. Home page content: fields the admin fills (in website order)

Legend: **Text** short text · **Long** paragraph · **Image** upload/URL · **Link** site path like `/register` or `https://…` · **List** add / remove / reorder rows.

### 4.1 Hero 1: welcome offer
| Field | Type | Today's value |
|---|---|---|
| Background (desktop) | Image | `/static_image/hero-desktop.webp` |
| Background (mobile) | Image | `/static_image/hero-mobile.webp` |
| Small title | Text | Welcome Bonus |
| Offer text | Text | CLAIM GC 150,000 + 2 SC |
| Button label | Text | Claim Now |
| Button link | Link | /register |

### 4.2 Hero 2: big banner
| Field | Type | Today |
|---|---|---|
| Image (desktop) | Image | `/static_image/banner-web.webp` |
| Image (mobile) | Image | `/static_image/banner-mobile.webp` |
| Alt text | Text | Play - Win - Redeem |
| Click link | Link | /register |

### 4.3 Intro heading
| Field | Type | Today |
|---|---|---|
| Line 1 | Text | Grab your |
| Highlighted word | Text | Free Coins |
| Connector | Text | & |
| Line 2 | Text | Start Winning! |
| Subtitle | Text | Welcome to your new Favorite Place to Play |

### 4.4 Category strip
**List** of 13 pills (Home, Bingo, Crash Game, Fishing, Instant Win, Keno, Live Dealer, Lottery, Scratch Cards, Shooting, Slots, Table Games, Virtual Game). Per pill: **Label** (Text), **Emoji/Icon** (Text), **Link** (Link, default `/casino`; can be `/category/<slug>`).

### 4.5 Our Top Games
| Field | Type | Today |
|---|---|---|
| Section title | Text | Our Top Games |
| Tile click link | Link | /register |
| Tiles | List, per tile: Name (Text), Image (Image) | 14 tiles (Golden Dragon, Ultra Panda, Juwa ...) |

Note: these tiles show **only when the live game catalog is empty**. The live catalog comes from the game providers (needs provider keys), not from admin.

### 4.6 Our Exclusive Platforms
| Field | Type | Today |
|---|---|---|
| Section title | Text | Our Exclusive Platforms |
| Max tiles | Number | 15 |
| Tiles | List, per tile: Name (Text), Image (Image), "NEW" badge (Yes/No) | from `featuredPlatformGames.js` (Golden Dragon, Ultra Panda, Egame99 NEW, Vblink, Juwa NEW ...) |

### 4.7 "More reasons to join"
| Field | Type | Today |
|---|---|---|
| Title lead / Title | Text, Text | More Reasons to / Join Dragon Fury today |
| 3 cards, each: Icon (Image), Title (Text), Text (Long) | List (3) | 24/7 Customer Help, New Games Every Week, Join Millions of Players |

### 4.8 Providers strip
| Field | Type | Today |
|---|---|---|
| Section title | Text | Providers |
| Logos | List, per logo: Name (Text), Image (Image) | 8 logos (Pragmatic Play, CQ9, Greentube, Playtech, Quickspin, Spadegaming, Spribe, Wazdan) |

### 4.9 Testimonials
| Field | Type | Today |
|---|---|---|
| Title / Subtitle | Text, Text | Our Players Speak For Us / Hear from our happy clients |
| Reviews | List (6), per review: Name (Text), Quote (Long), Stars (1–5) | 6 sample reviews |

### 4.10 Banner 1: "No Purchase Necessary"
| Field | Type | Today |
|---|---|---|
| Background | Image | `/static_image/play-for-free-bg.webp` |
| Character (desktop) / (mobile) | Image, Image | `play-for-free-character(.webp / -mobile.webp)` |
| Title | Text | No Purchase Necessary |
| Body | Long | (paragraph) |
| Button label / link | Text, Link | Play For Free / /register |
| Character side | Choice | Right / Left |

### 4.11 Feature cards (3)
Per card: **Icon** (emoji Text), **Title** (Text), **Text** (Long). Today: Play For Free, 100's Of Games, 24/7 Customer Help.

### 4.12 No-Purchase split section (currently switched **off**)
Fields: Title, Body (Long), Character (Image), Button label, Mobile button label, Button link. Keep as an optional section the admin can turn on.

### 4.13 Banner 2: "Claim Your Free Coins"
| Field | Type | Today |
|---|---|---|
| Background colour | Colour | #2F6B2F |
| Character | Image | `/static_image/claim-your-coin-character.webp` |
| Title | Text | Claim Your Free Coins |
| Body | Long | (paragraph) |
| Button label / link | Text, Link | Play For Free / /register |
| Character side | Choice | Left / Right |

### 4.14 Section order and on/off
All 13 sections above: a switch each, plus order. Today: all on except No-Purchase.

## 5. Site-wide fields that appear on the home page (store-level "Site settings")

Today these come from build-time env/code (`config/site.js`), so admin cannot change them. Proposed as a small second block under the same `settings` approach:

| Field | Type | Where it shows |
|---|---|---|
| Site name | Text | header, footer, section titles |
| Logo | Image | header, footer, loader |
| Browser tab icon (favicon) | Image | browser tab |
| SEO title | Text | browser tab, Google |
| SEO description | Long | Google, footer text |
| Support email, support phone | Text, Text | footer, contact |
| Footer social links (Instagram, X/Twitter, Facebook, Discord) | Link ×4 | footer icons (today hardcoded) |
| Login / Sign Up button labels | Text, Text | header |

## 6. Already admin-managed, only needs to be linked to the page (no new work)

| Item on the home page | Existing admin screen |
|---|---|
| Welcome bonus popup (on/off, SC amount, popup picture) | Welcome signup bonus |
| Floating social buttons (Facebook, Telegram, Messenger, WhatsApp) | Social media links |
| Footer menus and custom footer pages | Footer links |
| Privacy / Terms / Responsible Gaming pages | Pages → those tabs |
| Home page schema (Google JSON-LD) | Pages → Blog → "Home page schema" |
| Help Center and the chat messenger topics | Pages → Help Center |
| Payment links bar | Landing payment links |
| Spin wheel popup (3rd scroll) | Spin wheel |

Heads-up: the hero text "CLAIM GC 150,000 + 2 SC" is plain text; the Welcome bonus screen's SC amount (default 10) is separate. They can disagree, so the admin must keep both in sync (or we can generate the hero text from the bonus settings later).

Also: "Homepage pictures" (slideshow) is **not used by this new home page** (the hero images are fixed). Decide whether the hero images should come from "Homepage pictures" or from the new Home tab (recommendation: the new Home tab, to avoid two places).

## 7. Open decisions (need your answer)

1. **Images:** admin Upload needs an S3 bucket and keys (not set locally). Choose: (a) your own S3 bucket, or (b) URL paste only for now.
2. **Which store** is the real one (`dragonfury`, or an existing store such as `playjuwa`)? The frontend currently asks for `skyline777`, which does not exist in the restored data.
3. **Theme colours/fonts** (`theme` in `homeConfig.js`): keep fixed in code (recommended), or expose later.
4. Should a **change history / draft-publish** step exist? That would need a table, so I will ask before doing it. Not part of this plan.

## 8. Suggested order of work

1. Backend: save/load endpoints for `home_page_content` and the Site settings block (reuse `settings`, no table).
2. Admin: "Home" tab with the cards above (start with texts and links, then images).
3. Frontend: a hook that loads the content and merges over `homeConfig.js` defaults; wire sections one by one (Hero 1 → Intro → Reasons → Testimonials → Banners, then lists).
4. Test with the restored data: edit in admin, check the guest page, check mobile, check "API down" fallback.
5. Later: Site settings (logo, SEO), footer social links, then the logged-in lobby (banners, promo cards, sections).

---

## 9. Database: exactly where and how the data is stored (no new table)

### 9.1 Table used: `settings` (already exists, verified in `dragonfury_restored`)

| Column | Type | Meaning |
|---|---|---|
| `id` | integer, PK | row id |
| `key` | varchar, required | what the setting is, e.g. `social_links` |
| `value` | **text** | **the whole setting as JSON text** |
| `distributor_code` | varchar, null | owner distributor (this data has one: `casinoking`) |
| `store_code` | varchar, null | which store the row belongs to (e.g. `playjuwa`) |
| `created_at`, `updated_at` | timestamptz | timestamps |

A unique index on `(key, distributor_code, store_code)` guarantees **one row per key per store**.

How existing features already use it (real rows in the restored data, checked):

| key | scope | value (JSON) |
|---|---|---|
| `social_links` | one row per store | `{"facebook":"…","telegram":"…","messenger":"…"}` |
| `dashboard_slideshow_settings` | one row per store | `{"slides":[{"id","src","mobileSrc","alt","link","order"}],"updatedBy","updatedAt"}` |
| `welcome_signup_bonus_settings` | one row per store | `{"enabled":true,"amountSc":5,"modalImageUrl":null,"updatedBy","updatedAt"}` |

### 9.2 What we add: only new ROWS, never a new table or column

| Row (key) | `distributor_code` | `store_code` | `value` |
|---|---|---|---|
| `home_page_content` | store's distributor (e.g. `casinoking`) | the store (e.g. `dragonfury`) | JSON below |
| `site_settings` | same | same | JSON in 9.4 |

Images are **not** stored in the database. The file lives in S3 (or any host) and the JSON keeps only its **URL string**.

### 9.3 `home_page_content` JSON (every field name the admin screen saves)

```json
{
  "version": 1,
  "sections": {
    "order":   ["hero1","hero2","intro","categoryStrip","topGames","platforms","reasons","providers","testimonials","banner1","featureCards","noPurchase","banner2"],
    "enabled": { "hero1": true, "hero2": true, "intro": true, "categoryStrip": true, "topGames": true, "platforms": true, "reasons": true, "providers": true, "testimonials": true, "banner1": true, "featureCards": true, "noPurchase": false, "banner2": true }
  },
  "hero1": { "bgDesktop": "url", "bgMobile": "url", "eyebrow": "text", "offer": "text", "ctaLabel": "text", "ctaHref": "/register" },
  "hero2": { "imageDesktop": "url", "imageMobile": "url", "alt": "text", "href": "/register" },
  "intro": { "line1": "text", "highlight": "text", "line1b": "text", "line2": "text", "subtitle": "text" },
  "categoryStrip": { "items": [ { "label": "Slots", "emoji": "🎰", "href": "/casino" } ] },
  "topGames":  { "title": "text", "gameHref": "/register", "games": [ { "name": "text", "image": "url" } ] },
  "platforms": { "title": "text", "limit": 15, "items": [ { "name": "text", "image": "url", "isNew": false, "href": "/register" } ] },
  "reasons":   { "titleLead": "text", "title": "text", "cards": [ { "icon": "url", "title": "text", "body": "text" } ] },
  "providers": { "title": "text", "logos": [ { "name": "text", "image": "url" } ] },
  "testimonials": { "title": "text", "subtitle": "text", "items": [ { "name": "text", "quote": "text", "stars": 5 } ] },
  "banner1": { "bg": "url", "character": "url", "characterMobile": "url", "title": "text", "body": "text", "ctaLabel": "text", "ctaHref": "/register", "characterSide": "right" },
  "featureCards": [ { "icon": "🎮", "title": "text", "body": "text" } ],
  "noPurchase": { "title": "text", "body": "text", "character": "url", "ctaLabel": "text", "ctaLabelMobile": "text", "ctaHref": "/register" },
  "banner2": { "bgColor": "#2F6B2F", "character": "url", "title": "text", "body": "text", "ctaLabel": "text", "ctaHref": "/register", "characterSide": "left" },
  "updatedBy": "admin username",
  "updatedAt": "ISO date"
}
```

Rules the backend will enforce when saving: valid `http(s)` URL or a site path starting with `/` for every link/image; text length limits; stars 1–5; list sizes (for example 6 reviews, 15 platforms, 13 category pills); `characterSide` only `left` or `right`; unknown fields are dropped. The row stays small (about 8–12 KB), `value` is `text`, so size is not a problem.

### 9.4 `site_settings` JSON (store-level, section 5)

```json
{
  "platformName": "text", "logoUrl": "url", "faviconUrl": "url",
  "seoTitle": "text", "seoDescription": "text",
  "supportEmail": "text", "supportPhone": "text",
  "socials": { "instagram": "url", "twitter": "url", "facebook": "url", "discord": "url" },
  "loginLabel": "Login", "signupLabel": "Sign Up"
}
```

### 9.5 How it is read and written (same pattern as `social_links`)

- **Admin saves:** the admin's store (or the store master admin picks) → backend finds the row `(key, distributor_code, store_code)`; if missing it creates it (`findOrCreate`), else updates `value` and `updated_at`.
- **Website reads:** the frontend calls a public endpoint with the store (`store_code`, or resolved from the site host). The backend returns that row's JSON, or `{}` if the store has no row yet.
- **Frontend:** merges the JSON over `homeConfig.js` defaults. No row, empty field, or API error means today's design is shown.

### 9.6 "Migration": what actually has to happen

| Question | Answer |
|---|---|
| New table? | **No.** |
| New column / index? | **No.** `settings` already has everything needed. |
| Migration file? | **Not needed.** Rows are created by the admin's first Save. |
| Existing 13 stores? | Untouched. They keep the default design until an admin saves. |
| Production (live) DB? | Same: deploy code, nothing to run on the database. |
| Optional | A one-time data copy of today's `homeConfig.js` values into a row, so the admin sees filled fields on first open. This is a data insert (a row), not a structure change. Recommended: the admin screen can show the defaults as placeholders instead, so even this is not needed. |

If at some point a real table is needed (edit history, drafts), I will **ask for your permission first**.
