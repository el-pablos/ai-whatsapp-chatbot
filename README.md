<div align="center">

# ClawBot V4.1 — AI WhatsApp Chatbot

<img src="https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"> <img src="https://img.shields.io/badge/WhatsApp-Bot-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp"> <img src="https://img.shields.io/badge/AI-Claude%20Sonnet%204-7C4DFF?style=for-the-badge&logo=anthropic&logoColor=white" alt="Claude AI"> <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"> <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"> <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License">

![GitHub release (latest by date)](https://img.shields.io/github/v/release/el-pablos/ai-whatsapp-chatbot?style=flat-square&color=brightgreen)
![GitHub last commit](https://img.shields.io/github/last-commit/el-pablos/ai-whatsapp-chatbot?style=flat-square)
![GitHub repo size](https://img.shields.io/github/repo-size/el-pablos/ai-whatsapp-chatbot?style=flat-square)
![GitHub top language](https://img.shields.io/github/languages/top/el-pablos/ai-whatsapp-chatbot?style=flat-square)
![GitHub issues](https://img.shields.io/github/issues/el-pablos/ai-whatsapp-chatbot?style=flat-square)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/el-pablos/ai-whatsapp-chatbot/ci.yml?style=flat-square&label=CI)

**AI WhatsApp Chatbot v4.1 — 64 AI tools, Dashboard Admin Web, Phone Allowlist, Feature Toggle, Docker deployment, 15 database tables, 1280 tests.**

[Fitur](#-fitur-lengkap) · [Dashboard](#-dashboard-admin) · [Docker](#-docker) · [Instalasi](#-instalasi) · [Arsitektur](#-arsitektur) · [API](#-api--endpoints) · [Kontributor](#-kontributor)

</div>

---

## Deskripsi

ClawBot V4.1 adalah WhatsApp chatbot all-in-one yang dibangun di atas [Baileys](https://github.com/WhiskeySockets/Baileys) (WhatsApp Web API) dengan AI Claude Sonnet 4 sebagai otak utamanya. Bot ini punya persona unik — ngomong pake bahasa gaul Jakarta, tapi tetep pinter dan bisa bantu macem-macem hal.

**V4.1.0 Highlights:**
- **Dashboard Admin Web** — React SPA di port 6666, 10 halaman admin, dark mode
- **Phone Allowlist** — kontrol siapa yang boleh chat, manage via dashboard atau WhatsApp
- **Feature Toggle** — on/off fitur individual dari dashboard atau command, real-time
- **Docker Ready** — Dockerfile multi-stage + docker-compose production & development
- **64 AI-callable tools** — 4 allowlist tools baru
- **15 database tables** — 6 tabel baru untuk admin, allowlist, config, activity
- **Security hardened** — health check endpoints di-lock, admin auth bcrypt + httpOnly cookie
- **1280 tests** across 41 suites — 100% passing

---

## Fitur Lengkap

| Kategori | Fitur | Detail |
|----------|-------|--------|
| **🛡️ Admin** | **Dashboard Web** | React 19 SPA, port 6666, 10 halaman, dark mode (**v4.1**) |
| **🛡️ Admin** | **Phone Allowlist** | Kontrol siapa boleh chat bot, CRUD via dashboard & WA (**v4.1**) |
| **🛡️ Admin** | **Feature Toggle** | On/off fitur individual, real-time (**v4.1**) |
| **🛡️ Admin** | **Chat Monitor** | Pantau chat real-time, lihat detail percakapan (**v4.1**) |
| **🛡️ Admin** | **Analytics** | Grafik pesan/hari, top users, peak hours (**v4.1**) |
| **🛡️ Admin** | **Activity Logs** | Log semua aksi admin (**v4.1**) |
| **AI Chat** | AI-First Orchestrator | Tool-calling architecture: AI decides via 64 callable tools |
| **AI Chat** | Conversational AI | Claude Sonnet 4 via Copilot API, persona ClawBot |
| **AI Chat** | Conversation Memory | SQLite 24-jam context window, 6 bulan retention |
| **AI Chat** | Long-term Memory | Ingat preferensi user lintas sesi |
| **AI Chat** | Auto Memory Capture | Deteksi otomatis info penting dari chat |
| **Dokumen** | Universal Reader | 70+ format: PDF, DOCX, XLSX, PPTX, EPUB, ODT, dll |
| **Dokumen** | Archive Support | ZIP, RAR, 7Z, TAR, GZ |
| **Dokumen** | URL Summarizer | Rangkum konten dari URL website |
| **Media** | Vision API | Analisis gambar via Claude Vision |
| **Media** | Sticker Maker | Bikin sticker dari gambar/video/GIF |
| **Media** | Voice Transcription | Transkripsi voice note via Whisper |
| **Media** | GIF Search | Cari GIF via Tenor/Giphy |
| **Media** | Image Generation | Generate gambar via DALL-E 3 |
| **Media** | QR Code Generator | Bikin QR code dari teks/URL |
| **YouTube** | Video Info + Download | AI summary, MP3, MP4 download |
| **Web** | Web Search | DuckDuckGo search, auto-detect |
| **Cuaca** | Weather + Gempa | Prakiraan cuaca BMKG, info gempa terkini |
| **Lokasi** | Location Search | OpenStreetMap/Nominatim |
| **Kalender** | Date Utils | Hari libur, konversi tanggal |
| **Produktivitas** | Reminder | Natural language time parsing |
| **Produktivitas** | Notes & Todo | Catatan per user |
| **Produktivitas** | Translate | AI-powered, 20+ bahasa |
| **Produktivitas** | Calculator | Math, konversi satuan & mata uang |
| **Produktivitas** | Scheduled Messages | Pesan terjadwal |
| **Kolaborasi** | Polling | Poll, vote, visual bar chart |
| **Kolaborasi** | RSS Feeds | Subscribe & cek update |
| **Dokumen** | PDF Editor | Merge, extract halaman, info PDF |
| **Fun** | Tarot Reading | 78-kartu tarot spread |
| **Fun** | Mood Reader | Analisis mood dari chat |
| **File** | File Creator | .md, .txt, .csv, .json, dll |
| **File** | PPTX Generator | PowerPoint via Python backend |
| **Infra** | Health Check | Express :8008 (secured) |
| **Infra** | Auto Setup | yt-dlp, ffmpeg, pdftotext, LibreOffice |
| **Infra** | DNS Updater | Cloudflare DNS automation |
| **Infra** | Auto Backup | Database backup otomatis |
| **Infra** | Bug Reporter | Auto-report error ke owner |
| **Infra** | Docker | Multi-stage build, compose prod & dev (**v4.1**) |

---

## 📊 Dashboard Admin

Dashboard admin berjalan di port **6666** (terpisah dari health check di 8008). Built dengan React 19 + Vite + Tailwind CSS 4.

### Halaman Dashboard

| Halaman | Deskripsi |
|---------|-----------|
| **Login** | Auth dengan username/password, bcrypt hashing |
| **Overview** | Statistik umum: total user, pesan, uptime, aktivitas |
| **Allowlist** | CRUD nomor yang boleh chat bot, toggle on/off |
| **Bot Config** | Edit konfigurasi bot (model AI, session expiry, dll) |
| **Features** | Toggle on/off fitur individual secara real-time |
| **Chat Monitor** | Pantau percakapan, filter waktu, klik detail |
| **Chat Detail** | Lihat chat bubble + info user |
| **Analytics** | 4 grafik: pesan/hari, top users, tipe pesan, peak hours |
| **Logs** | Activity log semua aksi admin |
| **Settings** | Ganti password, system cleanup |

### WhatsApp Commands (Owner-only)

```
!izinkan 6281234567890      # Tambah nomor ke allowlist
!hapusizin 6281234567890    # Hapus dari allowlist
!toggleizin 6281234567890   # Toggle on/off
!daftarizin                 # Lihat semua allowlist
!fitur                      # Lihat status semua fitur
!matikanfitur ai_chat       # Matikan fitur
!hidupkanfitur ai_chat      # Hidupkan fitur
```

### Default Login

```
Username: admin
Password: admin123
```

> ⚠️ Ganti password setelah login pertama kali via halaman Settings.

---

## 🐳 Docker

### Production

```bash
# Build dan jalankan
docker-compose up -d

# Lihat logs
docker-compose logs -f
```

### Development (Hot Reload)

```bash
# Jalankan dev environment
docker-compose -f docker-compose.dev.yml up

# Frontend dev server di port 5173
# Bot + dashboard di port 8008 + 6666
```

### Manual Docker Build

```bash
# Build image
docker build -t clawbot .

# Run container
docker run -d \
  --name clawbot \
  -p 8008:8008 \
  -p 6666:6666 \
  -v ./data:/app/data \
  -v ./auth_info_baileys:/app/auth_info_baileys \
  --env-file .env \
  clawbot
```

---

## Arsitektur

### Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Runtime** | Node.js >= 20.0.0 |
| **WhatsApp Client** | @whiskeysockets/baileys |
| **AI Engine** | Claude Sonnet 4 (via Copilot API) |
| **Database** | SQLite (better-sqlite3, WAL mode) — 15 tabel |
| **Dashboard Backend** | Express 5, bcryptjs, jsonwebtoken, cookie-parser |
| **Dashboard Frontend** | React 19, Vite 7, Tailwind CSS 4, Lucide React |
| **Image Processing** | sharp |
| **Document Parsing** | pdf-parse, mammoth, adm-zip, textract |
| **PDF Editing** | pdf-lib |
| **Math Engine** | mathjs |
| **RSS Parser** | rss-parser |
| **QR Code** | qrcode |
| **Presentation Gen** | python-pptx (Python 3) |
| **Media Tools** | yt-dlp, ffmpeg, fluent-ffmpeg |
| **Containerization** | Docker, docker-compose |
| **Process Manager** | PM2 |
| **Testing** | Jest 30, supertest |

### Diagram Arsitektur (v4.1.0)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BOOTSTRAP LAYER                            │
│              autoSetup.js (berjalan SEBELUM npm load)               │
│     npm install → yt-dlp → ffmpeg → pdftotext → LibreOffice        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│                         MAIN ENTRY POINT                            │
│                    bot.js (WhatsApp Connection)                      │
│    Baileys client → QR/Pairing auth → Message listener → Cron jobs  │
│    ├── Allowlist filter (v4.1)                                      │
│    ├── Reminder cron (tiap menit)                                   │
│    ├── RSS feed checker (tiap 30 menit)                             │
│    └── Scheduled message sender (tiap menit)                        │
└────────────┬──────────────────────────────────┬─────────────────────┘
             │                                  │
┌────────────▼────────────┐      ┌──────────────▼──────────────────┐
│   AI-FIRST ORCHESTRATOR │      │     DASHBOARD ADMIN (v4.1)      │
│                         │      │   Express :6666 + React SPA     │
│ messageNormalizer.js    │      ├──────────────────────────────────┤
│ intentRouter.js         │      │ Auth: bcrypt + httpOnly cookie   │
│   └─ Feature toggle ✓  │      │ Allowlist: CRUD + toggle         │
│ promptComposer.js       │      │ Config: bot settings editor      │
│ aiOrchestrator.js       │      │ Features: on/off toggle          │
│ featureRegistry.js      │      │ Chat Monitor: real-time view     │
│ toolRegistry.js (64)    │      │ Analytics: 4 chart types         │
│   └─ Owner guard ✓     │      │ Logs: activity tracking          │
│   └─ Toggle guard ✓    │      │ Settings: password + cleanup     │
│ allowlistManager.js     │      └──────────────────────────────────┘
└────────────┬────────────┘
             │
  ┌──────────┼──────────────────────────────────┐
  ▼          ▼                                  ▼
┌──────────────────┐ ┌─────────────────────────┐ ┌──────────────────┐
│  INFRASTRUCTURE  │ │    FEATURE HANDLERS     │ │  EXTERNAL APIs   │
├──────────────────┤ │     (28 modules)        │ ├──────────────────┤
│ database.js      │ ├─────────────────────────┤ │ Copilot API      │
│  └─ SQLite WAL   │ │ document │ media        │ │  └─ Claude AI    │
│  └─ 15 tables    │ │ voice    │ sticker      │ │ DuckDuckGo       │
│ healthCheck.js   │ │ youtube  │ weather      │ │ BMKG API         │
│  └─ Express:8008 │ │ webSearch│ location     │ │ OpenStreetMap    │
│  └─ Secured ✓    │ │ tarot    │ mood         │ │ Cloudflare DNS   │
│ backupHandler.js │ │ calendar │ file/pptx    │ │ ExchangeRate API │
│ dnsUpdater.js    │ │ reminder │ memory       │ │ Tenor/Giphy API  │
│ capabilities.js  │ │ note     │ translate    │ │ OpenAI DALL-E    │
│ bugReporter.js   │ │ gif      │ qrCode       │ │                  │
│                  │ │ pdfEditor│ poll         │ │                  │
│                  │ │ calculator│ rss         │ │                  │
│                  │ │ imageGen │ scheduled    │ │                  │
│                  │ │ urlSummarizer           │ │                  │
└──────────────────┘ └─────────────────────────┘ └──────────────────┘
```

### Message Processing Flow (v4.1.0)

```
┌───────────────────────┐
│  User kirim pesan WA  │
└───────────┬───────────┘
            │
┌───────────▼───────────┐
│  bot.js: messages.upsert│
└───────────┬───────────┘
            │
┌───────────▼───────────┐
│  Dedup check (msgId   │
│  + content hash)      │
└───────────┬───────────┘
            │
┌───────────▼───────────┐     ┌──────────────────┐
│  Allowlist check      │────>│ BLOCKED: ignore  │
│  (v4.1 — owner always │     │ (not in allowlist)│
│   pass, empty = all)  │     └──────────────────┘
└───────────┬───────────┘
            │ ALLOWED
┌───────────▼───────────┐
│  normalizeMessage()   │
│  Baileys → uniform obj│
└───────────┬───────────┘
            │
┌───────────▼───────────┐
│  routeMessage()       │
│  intentRouter.js      │
│  + feature toggle ✓   │
└───────────┬───────────┘
            │
      ┌─────┴─────┐
      ▼           ▼
┌───────────┐ ┌───────────────┐
│ Fast-path │ │ AI Orchestr.  │
│ command   │ │ promptComposer│
│ (.s, .mp3)│ │ → Claude API  │
└─────┬─────┘ │ → tool_calls  │
      │       │ → executeTool │
      │       │   + owner ✓   │
      │       │   + toggle ✓  │
      │       └───────┬───────┘
      └───────┬───────┘
              ▼
┌──────────────────────┐
│  Kirim respons WA +  │
│  Simpan ke database  │
└──────────────────────┘
```

### Entity Relationship Diagram — 15 Tables

```
┌─────────────────────────────────────┐
│            conversations            │
├─────────────────────────────────────┤
│ id            INTEGER PK AUTOINCR   │
│ chat_id       TEXT NOT NULL         │──┐
│ sender_jid    TEXT NOT NULL         │──┤
│ sender_name   TEXT                  │  │
│ role          TEXT NOT NULL         │  │    ┌──────────────────────────┐
│ content       TEXT NOT NULL         │  │    │     user_profiles       │
│ message_id    TEXT                  │  │    ├──────────────────────────┤
│ quoted_message_id TEXT              │  ├───>│ jid         TEXT PK      │
│ quoted_content    TEXT              │  │    │ name        TEXT         │
│ media_type    TEXT                  │  │    │ first_seen  INTEGER      │
│ media_caption TEXT                  │  │    │ last_seen   INTEGER      │
│ timestamp     INTEGER NOT NULL      │  │    │ message_count INTEGER    │
│ created_at    DATETIME DEFAULT NOW  │  │    │ metadata    TEXT         │
└─────────────────────────────────────┘  │    └──────────────────────────┘
                                         │
                                         │    ┌──────────────────────────┐
                                         │    │   user_preferences       │
                                         └───>│ jid            TEXT PK   │
                                              │ preferred_name TEXT      │
                                              │ language       TEXT      │
                                              │ response_style TEXT      │
                                              │ is_owner       INTEGER   │
                                              │ custom_settings TEXT     │
                                              └──────────────────────────┘

┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐
│     long_term_memory     │  │        reminders         │  │          notes           │
├──────────────────────────┤  ├──────────────────────────┤  ├──────────────────────────┤
│ id       INTEGER PK      │  │ id       INTEGER PK      │  │ id       INTEGER PK      │
│ user_id  TEXT NOT NULL    │  │ user_id  TEXT NOT NULL    │  │ user_id  TEXT NOT NULL    │
│ category TEXT NOT NULL    │  │ chat_id  TEXT NOT NULL    │  │ title    TEXT NOT NULL    │
│ key      TEXT NOT NULL    │  │ message  TEXT NOT NULL    │  │ content  TEXT             │
│ value    TEXT NOT NULL    │  │ remind_at TEXT NOT NULL   │  │ type     TEXT DEFAULT note│
│ created_at DATETIME      │  │ status   TEXT DEFAULT pend│  │ status   TEXT DEFAULT open│
│ updated_at DATETIME      │  │ created_at DATETIME      │  │ created_at DATETIME      │
└──────────────────────────┘  └──────────────────────────┘  └──────────────────────────┘

┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐
│          polls           │  │        rss_feeds         │  │   scheduled_messages     │
├──────────────────────────┤  ├──────────────────────────┤  ├──────────────────────────┤
│ id       INTEGER PK      │  │ id       INTEGER PK      │  │ id       INTEGER PK      │
│ chat_id  TEXT NOT NULL    │  │ user_id  TEXT NOT NULL    │  │ user_id  TEXT NOT NULL    │
│ creator  TEXT NOT NULL    │  │ url      TEXT NOT NULL    │  │ target_chat_id TEXT      │
│ question TEXT NOT NULL    │  │ label    TEXT             │  │ message_text TEXT        │
│ options  TEXT NOT NULL    │  │ last_checked TEXT        │  │ send_at  TEXT NOT NULL    │
│ votes    TEXT DEFAULT {}  │  │ created_at DATETIME      │  │ status   TEXT DEFAULT pend│
│ status   TEXT DEFAULT open│  └──────────────────────────┘  │ created_at DATETIME      │
│ created_at DATETIME      │                                 └──────────────────────────┘
└──────────────────────────┘

┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐
│     allowlist (v4.1)     │  │    bot_config (v4.1)     │  │ feature_toggles (v4.1)   │
├──────────────────────────┤  ├──────────────────────────┤  ├──────────────────────────┤
│ id       INTEGER PK      │  │ config_key TEXT PK       │  │ feature_id TEXT PK       │
│ phone_number TEXT UNIQUE  │  │ config_value TEXT        │  │ is_enabled INTEGER DEF 1 │
│ display_name TEXT         │  │ description TEXT         │  │ disabled_by TEXT          │
│ is_active  INTEGER DEF 1 │  │ category TEXT            │  │ disabled_at DATETIME     │
│ added_by TEXT             │  │ updated_by TEXT          │  │ updated_at DATETIME      │
│ notes    TEXT             │  │ updated_at DATETIME      │  └──────────────────────────┘
│ created_at DATETIME      │  └──────────────────────────┘
│ updated_at DATETIME      │
└──────────────────────────┘

┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐
│   admin_users (v4.1)     │  │  admin_sessions (v4.1)   │  │  activity_logs (v4.1)    │
├──────────────────────────┤  ├──────────────────────────┤  ├──────────────────────────┤
│ id       INTEGER PK      │  │ id       INTEGER PK      │  │ id       INTEGER PK      │
│ username TEXT UNIQUE      │  │ admin_id INTEGER FK      │  │ admin_id INTEGER FK      │
│ password_hash TEXT        │  │ token    TEXT UNIQUE     │  │ action   TEXT NOT NULL    │
│ display_name TEXT         │  │ ip_address TEXT          │  │ target   TEXT             │
│ role     TEXT DEFAULT admin│  │ user_agent TEXT         │  │ details  TEXT             │
│ is_active INTEGER DEF 1  │  │ expires_at DATETIME      │  │ ip_address TEXT          │
│ last_login DATETIME      │  │ created_at DATETIME      │  │ created_at DATETIME      │
│ created_at DATETIME      │  └──────────────────────────┘  └──────────────────────────┘
└──────────────────────────┘
```

---

## Instalasi

### Prasyarat

- **Node.js** >= 20.0.0
- **npm** >= 9
- **Python 3** >= 3.8 + `python-pptx` (untuk PPTX generation)
- **ffmpeg** (untuk audio/video processing)
- **yt-dlp** (untuk YouTube download)
- **WhatsApp** aktif di HP (untuk scan QR)
- **Docker** (opsional, untuk containerized deployment)

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/el-pablos/ai-whatsapp-chatbot.git
cd ai-whatsapp-chatbot

# 2. Copy dan edit environment config
cp .env.example .env
# Edit .env sesuai kebutuhan (API URL, phone number, dll)

# 3. Install dependencies + auto-setup
npm run setup
# Atau manual:
npm install

# 4. Build dashboard frontend
npm run dashboard:build

# 5. Install Python dependencies (untuk PPTX generation)
pip install -r tools/requirements.txt

# 6. Start bot
node src/bot.js

# 7. Scan QR code yang muncul di terminal dengan WhatsApp HP
# 8. Buka dashboard di http://localhost:6666
```

### Menggunakan PM2 (Production)

```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Logs
pm2 logs ai-whatsapp-chatbot
```

### Menggunakan Docker

```bash
# Production (recommended)
docker-compose up -d

# Development (hot reload)
docker-compose -f docker-compose.dev.yml up

# Lihat logs
docker-compose logs -f
```

### Auto Setup

Bot akan otomatis install dependency system saat pertama kali jalan di Linux:
- `npm install` (jika `node_modules` belum ada atau hash berubah)
- `yt-dlp` (via pip3 atau binary download)
- `ffmpeg` (via apt/yum/apk)
- `pdftotext` / `poppler-utils`
- `LibreOffice` (optional, set `AUTOSETUP_INSTALL_LIBREOFFICE=1`)

---

## Konfigurasi Environment

```env
# === AI Configuration ===
COPILOT_API_URL=http://localhost:4141    # URL Copilot/AI API
COPILOT_API_MODEL=claude-sonnet-4-20250514  # Model AI yang dipakai

# === WhatsApp Auth ===
WA_AUTH_METHOD=qr                        # 'qr' atau 'pairing'
WA_PHONE_NUMBER=628xxx                   # Nomor HP (untuk pairing mode)

# === Database ===
DB_PATH=./data/chat_memory.db            # Path database SQLite
SESSION_EXPIRY_HOURS=24                  # Context window AI (jam)
RETENTION_MONTHS=6                       # Retention data (bulan)

# === Dashboard Admin (v4.1) ===
DASHBOARD_PORT=6666                      # Port dashboard web (WAJIB 6666)
DASHBOARD_SESSION_HOURS=24               # Session expiry admin
DASHBOARD_ADMIN_USER=admin               # Username default admin
DASHBOARD_ADMIN_PASS=admin123            # Password default (ganti setelah login!)

# === Image Generation (Optional) ===
OPENAI_API_KEY=sk-xxx                    # Untuk /imagine (DALL-E 3)

# === GIF Search (Optional) ===
TENOR_API_KEY=xxx                        # Untuk /gif (Tenor)
GIPHY_API_KEY=xxx                        # Fallback GIF (Giphy)

# === Auto Setup ===
AUTO_GIT_PULL=1                          # Auto git pull saat boot
AUTOSETUP_INSTALL_LIBREOFFICE=0          # Auto-install LibreOffice

# === Cloudflare DNS (optional) ===
CF_ZONE_ID=xxx
CF_DNS_API_TOKEN=xxx
CF_TARGET_DOMAIN=bot.example.com

# === Bug Reporter ===
BUG_REPORT_OWNER=628xxx                  # Auto-report error ke nomor ini

# === Misc ===
LOG_LEVEL=info                           # Level logging
NODE_ENV=production
```

---

## API & Endpoints

### Health Check Server (port 8008)

| Endpoint | Method | Auth | Deskripsi |
|----------|--------|------|-----------|
| `/health` | GET | Public | Health check sederhana |
| `/status` | GET | Public | Status koneksi WhatsApp |
| `/capabilities` | GET | Public | Daftar dependency dan status |
| `/dashboard` | GET | — | Redirect notice ke port 6666 |
| `/users` | GET | — | **403 Forbidden** (moved to dashboard) |
| `/stats` | GET | — | **403 Forbidden** (moved to dashboard) |

### Dashboard API (port 6666)

| Endpoint | Method | Auth | Deskripsi |
|----------|--------|------|-----------|
| `/api/auth/login` | POST | Public | Login admin |
| `/api/auth/logout` | POST | Auth | Logout + clear session |
| `/api/auth/me` | GET | Auth | Get current user |
| `/api/auth/change-password` | POST | Auth | Ganti password |
| `/api/allowlist` | GET | Auth | List semua allowlist |
| `/api/allowlist` | POST | Auth | Tambah nomor |
| `/api/allowlist/:phone` | PUT | Auth | Update entry |
| `/api/allowlist/:phone` | DELETE | Auth | Hapus nomor |
| `/api/allowlist/:phone/toggle` | POST | Auth | Toggle on/off |
| `/api/config` | GET | Auth | Get semua config |
| `/api/config/:key` | PUT | Auth | Update config value |
| `/api/config/reset` | POST | Auth | Reset ke default |
| `/api/features` | GET | Auth | List fitur + toggle state |
| `/api/features/:id` | PUT | Auth | Toggle fitur on/off |
| `/api/chats` | GET | Auth | List chat terbaru |
| `/api/chats/:id` | GET | Auth | Detail percakapan |
| `/api/chats/:id/user` | GET | Auth | Profile user |
| `/api/analytics/*` | GET | Auth | Messages, top-users, types, peak-hours, overview |
| `/api/system/health` | GET | Public | Dashboard health |
| `/api/system/logs` | GET | Auth | Activity logs |
| `/api/system/cleanup` | POST | Auth | Cleanup expired data |
| `/api/users` | GET | Auth | List users (masked phone) |

---

## Struktur Projek

```
ai-whatsapp-chatbot/
├── src/
│   ├── bot.js                 # Entry point + Baileys + cron + allowlist filter
│   ├── featureRegistry.js     # 48+ feature metadata registry
│   ├── toolRegistry.js        # 64 AI-callable tools + guards
│   ├── messageNormalizer.js   # Baileys proto → uniform message
│   ├── promptComposer.js      # Context + memory prompt builder
│   ├── aiOrchestrator.js      # Tool-calling loop + retry logic
│   ├── intentRouter.js        # Command routing + feature toggle
│   ├── allowlistManager.js    # Allowlist control module [v4.1]
│   ├── aiHandler.js           # AI chat via Claude Sonnet 4
│   ├── autoSetup.js           # Auto-install dependencies
│   ├── backupHandler.js       # Database backup
│   ├── bugReporter.js         # Auto bug report ke owner
│   ├── calculatorHandler.js   # Math, unit convert, currency
│   ├── calendarHandler.js     # Kalender & hari libur
│   ├── capabilities.js        # Dependency registry
│   ├── database.js            # SQLite 15 tabel, WAL mode
│   ├── dnsUpdater.js          # Cloudflare DNS automation
│   ├── documentHandler.js     # Universal document reader
│   ├── errorUtils.js          # Error handling utilities
│   ├── fileCreator.js         # Create & send files
│   ├── gifHandler.js          # GIF search (Tenor/Giphy)
│   ├── healthCheck.js         # Express health check (secured)
│   ├── imageGenHandler.js     # DALL-E 3 image generation
│   ├── locationHandler.js     # Location search
│   ├── mediaHandler.js        # Image/media + Vision API
│   ├── memoryHandler.js       # Long-term memory CRUD
│   ├── messageUtils.js        # Message formatting helpers
│   ├── moodHandler.js         # Mood analysis
│   ├── noteHandler.js         # Notes & to-do list
│   ├── pdfEditorHandler.js    # PDF merge/extract/info
│   ├── pollHandler.js         # Polling system
│   ├── pptxHandler.js         # PPTX generation (python-pptx)
│   ├── pythonRunner.js        # Python script runner
│   ├── qrCodeHandler.js       # QR code generator
│   ├── reminderHandler.js     # Reminder system
│   ├── rssHandler.js          # RSS feed subscriber
│   ├── scheduledMessageHandler.js
│   ├── stickerHandler.js      # Sticker maker (ffmpeg)
│   ├── tarotHandler.js        # 78-kartu tarot reading
│   ├── translateHandler.js    # AI-powered translation
│   ├── urlSummarizerHandler.js
│   ├── userProfileHelper.js   # User classification + OWNER_PHONES
│   ├── voiceHandler.js        # Voice transcription
│   ├── weatherHandler.js      # BMKG weather & gempa
│   ├── webSearchHandler.js    # DuckDuckGo web search
│   ├── youtubeHandler.js      # YouTube download (yt-dlp)
│   └── dashboard/             # Dashboard Admin [v4.1]
│       ├── server.js          # Express API server (:6666)
│       ├── public/            # Built React SPA assets
│       └── frontend/          # React source code
│           ├── src/
│           │   ├── App.jsx
│           │   ├── main.jsx
│           │   ├── index.css
│           │   ├── components/Layout.jsx
│           │   ├── contexts/AuthContext.jsx
│           │   ├── lib/utils.js
│           │   └── pages/     # 10 pages
│           └── index.html
├── tools/
│   ├── pptx_generator.py      # Python PPTX generator
│   └── requirements.txt       # Python dependencies
├── tests/                     # 1280 tests, 41 suites
├── Dockerfile                 # Multi-stage build [v4.1]
├── docker-compose.yml         # Production [v4.1]
├── docker-compose.dev.yml     # Development [v4.1]
├── .dockerignore              # Docker ignore rules [v4.1]
├── vite.config.js             # Vite config for dashboard
├── package.json
├── ecosystem.config.js        # PM2 configuration
├── CHANGELOG.md
└── README.md
```

---

## Testing

```bash
# Jalankan semua tests
npm test

# Watch mode
npm run test:watch

# Cek dependency health
npm run doctor
```

**Test Coverage:** 1280 tests across 41 test suites — 100% passing.

---

## Security

Projek ini menerapkan beberapa praktik keamanan:

- **No shell injection** — Semua command execution menggunakan `execFile()` dengan array argument
- **Parameterized SQL** — Semua query database menggunakan prepared statements
- **Input validation** — Video ID, document extension, phone number divalidasi
- **File sanitization** — Filename disanitasi sebelum digunakan
- **Admin auth** — bcrypt password hashing, httpOnly cookies, session expiry
- **Health check secured** — `/users`, `/stats`, `/cleanup` return 403 Forbidden
- **Owner-only commands** — Allowlist & feature toggle commands dilindungi owner check
- **Tool execution guards** — `requiresOwner` flag + feature toggle check sebelum executeTool
- **Dependency audit** — CI pipeline menjalankan `npm audit` di setiap push

---

## Kontributor

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/el-pablos">
        <img src="https://github.com/el-pablos.png" width="100px;" alt="Tama El Pablo"/><br />
        <sub><b>Tama El Pablo</b></sub>
      </a><br />
      <sub>Creator & Maintainer</sub>
    </td>
  </tr>
</table>

---

## License

Projek ini dilisensikan di bawah [MIT License](LICENSE).

---

<div align="center">

**Dibuat dengan kopi dan begadang oleh [el-pablos](https://github.com/el-pablos)**

![GitHub stars](https://img.shields.io/github/stars/el-pablos/ai-whatsapp-chatbot?style=social)
![GitHub forks](https://img.shields.io/github/forks/el-pablos/ai-whatsapp-chatbot?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/el-pablos/ai-whatsapp-chatbot?style=social)

</div>
