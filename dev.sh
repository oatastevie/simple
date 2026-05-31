#!/usr/bin/env bash
set -euo pipefail

LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")

echo "→ Next.js dev server (Ctrl+C to stop)"
echo "   Mac:    http://localhost:3000"
[ -n "$LAN_IP" ] && echo "   iPhone: http://${LAN_IP}:3000 (same Wi-Fi)"
echo ""

pnpm next dev --hostname 0.0.0.0
