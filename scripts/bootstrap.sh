#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# Bootstrap Script — Auto-install all dependencies
#
# Runs BEFORE bot.js starts (called by PM2 or manually).
# Safe to run multiple times — skips already-installed deps.
#
# Usage:
#   bash scripts/bootstrap.sh        # manual
#   pm2 start ecosystem.config.js    # auto via pre-start
#
# @author Tama El Pablo
# @version 1.0.0
# ═══════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║          🚀 WA-TAMA-BOT BOOTSTRAP v1.0                  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

cd "$PROJECT_DIR"

# ───────────────────────────────────────────────────────────
# 1. Node.js check
# ───────────────────────────────────────────────────────────
echo "▸ Checking Node.js..."
if ! command -v node &>/dev/null; then
    echo "  ❌ Node.js not found! Please install Node.js >= 20"
    echo "     curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "     sudo apt-get install -y nodejs"
    exit 1
fi
NODE_VER=$(node -v)
echo "  ✅ Node.js $NODE_VER"

# ───────────────────────────────────────────────────────────
# 2. npm install (skip if node_modules is fresh)
# ───────────────────────────────────────────────────────────
echo "▸ Checking npm dependencies..."
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules/.package-lock.json" ] 2>/dev/null; then
    echo "  📦 Running npm install..."
    npm install --production --no-audit --no-fund 2>&1 | tail -3
    echo "  ✅ npm dependencies installed"
else
    echo "  ✅ node_modules up to date (skipped)"
fi

# ───────────────────────────────────────────────────────────
# 3. Create required directories
# ───────────────────────────────────────────────────────────
echo "▸ Creating directories..."
mkdir -p logs downloads auth_info_baileys
echo "  ✅ logs/ downloads/ auth_info_baileys/"

# ───────────────────────────────────────────────────────────
# 4. yt-dlp (Python-based YouTube downloader)
# ───────────────────────────────────────────────────────────
echo "▸ Checking yt-dlp..."
if command -v yt-dlp &>/dev/null; then
    YT_VER=$(yt-dlp --version 2>/dev/null || echo "unknown")
    echo "  ✅ yt-dlp $YT_VER (already installed)"
else
    echo "  📦 Installing yt-dlp..."
    # Try pip first (cleanest), then curl binary, then apt
    if command -v pip3 &>/dev/null; then
        pip3 install --quiet --break-system-packages yt-dlp 2>/dev/null \
            || pip3 install --quiet yt-dlp 2>/dev/null \
            || true
    fi

    if ! command -v yt-dlp &>/dev/null; then
        # Direct binary download (no pip needed)
        echo "  📦 pip not available, downloading binary..."
        sudo curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
            -o /usr/local/bin/yt-dlp 2>/dev/null && \
        sudo chmod a+rx /usr/local/bin/yt-dlp 2>/dev/null || true
    fi

    if command -v yt-dlp &>/dev/null; then
        echo "  ✅ yt-dlp installed successfully"
    else
        echo "  ⚠️  yt-dlp install failed — YouTube features will be disabled"
    fi
fi

# ───────────────────────────────────────────────────────────
# 5. ffmpeg (audio/video processing)
# ───────────────────────────────────────────────────────────
echo "▸ Checking ffmpeg..."
if command -v ffmpeg &>/dev/null; then
    FF_VER=$(ffmpeg -version 2>/dev/null | head -1 | awk '{print $3}' || echo "unknown")
    echo "  ✅ ffmpeg $FF_VER (already installed)"
else
    echo "  📦 Installing ffmpeg..."
    if command -v apt-get &>/dev/null; then
        sudo apt-get update -qq 2>/dev/null
        sudo apt-get install -y -qq ffmpeg 2>/dev/null
    elif command -v yum &>/dev/null; then
        sudo yum install -y -q ffmpeg 2>/dev/null || true
    elif command -v apk &>/dev/null; then
        sudo apk add --quiet ffmpeg 2>/dev/null || true
    fi

    if command -v ffmpeg &>/dev/null; then
        echo "  ✅ ffmpeg installed successfully"
    else
        echo "  ⚠️  ffmpeg install failed — audio conversion may not work"
        echo "     (Node.js @ffmpeg-installer/ffmpeg fallback will be used)"
    fi
fi

# ───────────────────────────────────────────────────────────
# 6. Python3 (needed by yt-dlp if installed via pip)
# ───────────────────────────────────────────────────────────
echo "▸ Checking Python3..."
if command -v python3 &>/dev/null; then
    PY_VER=$(python3 --version 2>/dev/null || echo "unknown")
    echo "  ✅ $PY_VER"
else
    echo "  ⚠️  Python3 not found (yt-dlp binary mode — OK)"
fi

# ───────────────────────────────────────────────────────────
# 7. .env file check
# ───────────────────────────────────────────────────────────
echo "▸ Checking .env file..."
if [ -f ".env" ]; then
    echo "  ✅ .env exists"
else
    echo "  ⚠️  .env not found — bot may use defaults"
    echo "     Copy .env.example to .env and configure"
fi

# ───────────────────────────────────────────────────────────
# Summary
# ───────────────────────────────────────────────────────────
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║          ✅ BOOTSTRAP COMPLETE                           ║"
echo "╠═══════════════════════════════════════════════════════════╣"
printf "║  node     : %-44s ║\n" "$(node -v 2>/dev/null || echo 'N/A')"
printf "║  npm      : %-44s ║\n" "$(npm -v 2>/dev/null || echo 'N/A')"
printf "║  yt-dlp   : %-44s ║\n" "$(yt-dlp --version 2>/dev/null || echo 'NOT INSTALLED')"
printf "║  ffmpeg   : %-44s ║\n" "$(ffmpeg -version 2>/dev/null | head -1 | awk '{print $3}' || echo 'NOT INSTALLED')"
printf "║  python3  : %-44s ║\n" "$(python3 --version 2>/dev/null | awk '{print $2}' || echo 'NOT INSTALLED')"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "🚀 Starting bot..."
