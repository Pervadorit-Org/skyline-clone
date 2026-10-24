# Dragon Fury store clone

Separate `frontend/`, `backend/`, and `admin/` — same layout as Play Juwa / Casino Slots clones.

## Local ports

- Frontend: http://localhost:5173
- Admin: http://localhost:5174
- Backend: http://localhost:8080

## Production

- Site: https://luckywinners.bet
- Admin: https://admin.luckywinners.bet
- Backend on the server: **8085** (nginx proxies `/api`, PM2 `skyline-api`)

See [docs/DEPLOY.md](docs/DEPLOY.md) for nginx, PM2, Certbot, and GitHub Actions.

## Setup

### Backend

```bat
cd backend
copy env.sample .env
npm install
npm run start:dev
```

Store code stays `dragonfury`. Set that store’s User site URL to `https://luckywinners.bet`.

### Frontend

```bat
cd frontend
copy .env.sample .env
npm install
npm run dev
```

### Admin

```bat
cd admin
copy .env.sample .env
npm install
npm run dev
```

This clone does **not** include Play Juwa Google Analytics, Google tags, Microsoft Clarity, canonicals, or sitemaps. Add Dragon Fury’s own tracking later if needed.
