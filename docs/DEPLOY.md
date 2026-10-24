# Deploy Lucky Winners (luckywinners.bet)

Nginx serves the Vite `dist` folders. `/api` and Socket.IO proxy to the Node API on **port 8085**.

| Host | App |
|---|---|
| https://luckywinners.bet | User frontend |
| https://www.luckywinners.bet | Redirects to apex |
| https://admin.luckywinners.bet | Admin panel |
| `127.0.0.1:8085` | Backend (PM2 `skyline-api`) |

Port 8085 is local only. Do not open it in the EC2 security group. 8080 and 8084 are used by other stores on a shared box.

## GitHub Actions secrets

Repo → Settings → Secrets and variables → Actions:

- `EC2_HOST`
- `EC2_USER`
- `EC2_SSH_PRIVATE_KEY`
- `EC2_SSH_PORT` (optional, default `22`)

Push to `main` runs lint/build, then SSH deploys.

## First-time server setup

```bash
sudo mkdir -p /var/www
sudo chown "$USER:$USER" /var/www
git clone <THIS_REPO_URL> /var/www/skyline-clone
cd /var/www/skyline-clone

# Env files are copied from your machine (they are gitignored).
# Store code stays dragonfury. Domains point at luckywinners.bet. PORT=8085.

cd backend && npm install --omit=dev && npm run migrate
cd ../frontend && npm install && npm run build
cd ../admin && npm install && npm run build

# Start PM2 once. Later deploys only `pm2 restart skyline-api`.
cd /var/www/skyline-clone/backend
pm2 start index.js --name skyline-api
pm2 save
pm2 startup

sudo cp frontend/nginx.luckywinners.bet.conf /etc/nginx/sites-available/luckywinners.bet
sudo ln -sf /etc/nginx/sites-available/luckywinners.bet /etc/nginx/sites-enabled/luckywinners.bet
sudo nginx -t

# DNS A records for luckywinners.bet, www, and admin must point here first.
sudo certbot --nginx -d luckywinners.bet -d www.luckywinners.bet
sudo certbot --nginx -d admin.luckywinners.bet
sudo systemctl reload nginx
```

Confirm API:

```bash
curl -sS http://127.0.0.1:8085/api/healthcheck
```

Store code stays `dragonfury` (same database). In admin, set that store’s User site URL to `https://luckywinners.bet`.

## Nginx

Production site file: `frontend/nginx.luckywinners.bet.conf`

- Upstream: `127.0.0.1:8085`
- SPA + hashed assets
- `/api` and `/socket.io/` → backend
- GitSlotPark root POSTs (`GetBalance`, `Deposit`, …)
- Deploy maintenance via `/var/www/skyline-clone/maintenance.flag`

After certbot, SSL paths should be:

- `/etc/letsencrypt/live/luckywinners.bet/`
- `/etc/letsencrypt/live/admin.luckywinners.bet/`

If www is not on the apex certificate, issue a combined cert:

```bash
sudo certbot --nginx -d luckywinners.bet -d www.luckywinners.bet --expand
```
