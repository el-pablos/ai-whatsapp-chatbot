#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# PM2 Start Script — Bootstrap + Launch bot
#
# Called by PM2 via ecosystem.config.js
# 1. Runs bootstrap (npm install, yt-dlp, ffmpeg, dirs)
# 2. Starts bot.js
#
# @author Tama El Pablo
# ═══════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

# Run bootstrap (safe to run every restart — skips installed deps)
bash scripts/bootstrap.sh

# Start the bot
exec node src/bot.js
