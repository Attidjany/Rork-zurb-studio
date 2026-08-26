#!/usr/bin/env bash
# Build + deploy ZURB Studio (web export + Node API) to Cloudways.
#   ./deploy/deploy.sh            build & deploy
#   ./deploy/deploy.sh --setup    first deploy: also installs pm2 process + .env from server/.env.production
#   ./deploy/deploy.sh --no-build deploy existing builds
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/deploy/deploy.env"
: "${SSH_USER:?}" "${SSH_HOST:?}" "${SSH_PASS:?}" "${APP_ID:?}" "${API_DIR:?}" "${PM2_NAME:?}"

SETUP=0; BUILD=1
for a in "$@"; do case "$a" in --setup) SETUP=1;; --no-build) BUILD=0;; esac; done

SSH="sshpass -p $SSH_PASS ssh -o StrictHostKeyChecking=no $SSH_USER@$SSH_HOST"
RSYNC="sshpass -p $SSH_PASS rsync -rlz --omit-dir-times --no-perms --no-owner --no-group -e 'ssh -o StrictHostKeyChecking=no'"
RS="sshpass -p $SSH_PASS rsync -rlz --omit-dir-times --no-perms --no-owner --no-group -e 'ssh -o StrictHostKeyChecking=no'"
PUBLIC="/home/master/applications/$APP_ID/public_html"

if [ $BUILD = 1 ]; then
  echo "▶ building web"; (cd "$ROOT/expo" && CI=1 npx expo export -p web)
  echo "▶ building server"; (cd "$ROOT/server" && npm run build)
fi

echo "▶ uploading web → $PUBLIC"
eval $RSYNC --exclude proxy.php --exclude .htaccess --exclude index.php --exclude app.html "$ROOT/expo/dist/" "$SSH_USER@$SSH_HOST:$PUBLIC/" || [ $? = 23 ]
eval $RS "$ROOT/deploy/public_html/" "$SSH_USER@$SSH_HOST:$PUBLIC/" || [ $? = 23 ]
# the SPA shell is served by index.php (no-store); never leave a cacheable index.html behind
$SSH "cd $PUBLIC && mv -f index.html app.html"

echo "▶ uploading api → $API_DIR"
$SSH "mkdir -p $API_DIR/dist"
eval $RS "$ROOT/server/dist/index.js" "$SSH_USER@$SSH_HOST:$API_DIR/dist/index.js"
$SSH "cd $API_DIR && [ -f package.json ] || echo '{\"name\":\"zurb-api\",\"type\":\"module\",\"private\":true}' > package.json"

if [ $SETUP = 1 ]; then
  echo "▶ installing .env + pm2"
  eval $RS "$ROOT/server/.env.production" "$SSH_USER@$SSH_HOST:$API_DIR/.env"
  $SSH "export PATH=\$PATH:\$HOME/.npm-global/bin; cd $API_DIR && (pm2 describe $PM2_NAME >/dev/null 2>&1 && pm2 restart $PM2_NAME || pm2 start dist/index.js --name $PM2_NAME) && pm2 save"
else
  $SSH "export PATH=\$PATH:\$HOME/.npm-global/bin; pm2 restart $PM2_NAME"
fi
sleep 2
$SSH "curl -s http://127.0.0.1:3001/api/health"; echo
echo "✔ done"
