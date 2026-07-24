#!/usr/bin/env bash
set -Eeuo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; cd "$project_dir"
[ -f .env ] || { echo 'Missing .env; copy .env.example and supply real secrets.' >&2; exit 1; }; set -a; . ./.env; set +a
[ "${#JWT_SECRET}" -ge 32 ] || { echo 'JWT_SECRET must contain at least 32 characters.' >&2; exit 1; }
for d in backend/node_modules frontend/node_modules; do [ -d "$d" ] || { echo "Missing $d; prepare dependencies per OPERATIONS.md." >&2; exit 1; }; done
backend_port="${BACKEND_PORT:-${PORT:-3001}}"; frontend_port="${FRONTEND_PORT:-3000}"
for port in "$backend_port" "$frontend_port"; do if lsof -ti ":$port" >/dev/null 2>&1; then echo "Port $port is occupied; refusing to terminate another process." >&2; exit 1; fi; done
if [ "${ALLOW_SCHEMA_MIGRATION:-false}" = true ]; then node backend/scripts/prepareRuntime.js; fi
pids=(); cleanup(){ for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done; }; trap cleanup EXIT INT TERM
(cd backend && PORT="$backend_port" npm start) & pids+=("$!"); (cd frontend && PORT="$frontend_port" BROWSER=none CI=true REACT_APP_API_URL="http://127.0.0.1:$backend_port" npm start) & pids+=("$!"); wait
