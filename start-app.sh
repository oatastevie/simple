#!/usr/bin/env bash
set -euo pipefail

command -v supabase >/dev/null || { echo "supabase CLI not installed: https://supabase.com/docs/guides/cli"; exit 1; }
docker info >/dev/null 2>&1 || { echo "Docker not running. Start Docker Desktop."; exit 1; }

if ! supabase status >/dev/null 2>&1; then
  echo "→ Starting Supabase..."
  supabase start
else
  echo "→ Supabase already running."
fi

ANON_KEY=$(supabase status -o env | grep '^ANON_KEY=' | cut -d= -f2- | tr -d '"')
[ -n "$ANON_KEY" ] || { echo "Could not read ANON_KEY from supabase status"; exit 1; }

echo "→ Building and starting Next.js container..."
echo "   App: http://localhost:3000"
echo "   Supabase Studio: http://localhost:54323"
echo ""

NEXT_PUBLIC_SUPABASE_URL="http://host.docker.internal:54321" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY" \
docker compose up --build
