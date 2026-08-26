# Deploying ZURB Studio on Cloudways

Live: Cloudways app `gpqjkzkwbe` on server `178.62.214.98` (default URL `phpstack-1601195-6636805.cloudwaysapps.com`, target domain `studio.zenoah.org`). MariaDB 10.11 — the schema is MySQL/MariaDB compatible.

Layout on the server:

```
/home/master/applications/<app-id>/public_html/   ← expo/dist (static web app) + index.php + .htaccess + proxy.php
/home/master/zurb/                                ← server bundle: dist/index.js + package.json + .env
pm2 process "zurb-api" → 127.0.0.1:3001           (pm2 in ~/.npm-global, `@reboot pm2 resurrect` in crontab)
```

* nginx serves real files from public_html directly and falls back to `index.php` for everything
  else; `index.php` forwards `/api/*` to the Node API on :3001 through `proxy.php` (same pattern as
  Lamtôro OS) and serves the SPA shell (`app.html`, renamed from `index.html` at deploy time) with
  `Cache-Control: no-store`. `.htaccess` covers the same for Apache.
* Varnish sits in front of nginx. GETs that returned before the dispatcher existed can stay cached
  (a 404 for `/api/health` was cached for a while); purge Varnish from the Cloudways panel after a
  deploy if something looks stale. Deploys never delete old hashed bundles for that reason.
* Supabase data was imported once with `node dist/import.js ./supa <temp-password>` (built from
  `server/scripts/import-supabase.ts`).
* The API needs the Cloudways MySQL credentials of that application in `/home/master/zurb/.env`
  (see `server/.env.example`). Tables are created automatically on first boot.

## One-time setup
1. Create the application in the Cloudways panel (PHP stack), attach the domain, enable SSL.
2. Fill `deploy/deploy.env` (copy from `deploy/deploy.env.example`).
3. `./deploy/deploy.sh --setup` — uploads everything, writes `.env`, starts pm2.

## Every release
```
./deploy/deploy.sh          # builds web + server, rsyncs both, restarts pm2
```
After a deploy that changes `index.html`, purge Varnish in the Cloudways panel if the old shell persists.
