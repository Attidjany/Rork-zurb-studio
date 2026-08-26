# Deploying ZURB Studio on Cloudways

Layout on the server (one Cloudways PHP application, e.g. `zurbstudio.zenoah.org`):

```
/home/master/applications/<app-id>/public_html/   ← expo/dist (static web app) + .htaccess + proxy.php
/home/master/zurb/                                ← server bundle: dist/index.js + package.json + .env
pm2 process "zurb-api" → 127.0.0.1:3001
```

* `.htaccess` rewrites `/api/*` to `proxy.php`, which forwards to the Node API on :3001
  (same pattern as Lamtôro OS). Everything else is served by nginx as static files,
  with an SPA fallback to `index.html`.
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
