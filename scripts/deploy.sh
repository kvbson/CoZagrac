#!/usr/bin/env bash
# Deploy CoZagrac on the VPS. Run by GitHub Actions over SSH, or manually:
#   bash /opt/cozagrac/scripts/deploy.sh
# Never touches apps/backend/.env (untracked in git) nor the database schema -
# schema changes stay a manual, verified step (docs/wdrozenie_aplikacji_vps.md).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/cozagrac}"
BRANCH="${BRANCH:-dev}"

cd "$APP_DIR"

echo "[deploy] fetching origin and resetting to origin/$BRANCH"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"
echo "[deploy] now at: $(git log -1 --oneline)"

echo "[deploy] building images (uses local layer cache)"
docker compose build

echo "[deploy] rolling containers"
docker compose up -d

echo "[deploy] health check (backend on loopback)"
ok=0
for _ in $(seq 1 12); do
  if curl -fsS http://127.0.0.1:3001/api/health >/dev/null; then
    ok=1
    break
  fi
  sleep 5
done
if [ "$ok" -ne 1 ]; then
  echo "[deploy] HEALTH CHECK FAILED - recent backend logs:" >&2
  docker compose logs --tail=50 backend >&2
  exit 1
fi

docker image prune -f
echo "[deploy] done"
