<div align="center">

# ClawBot V4 — AI WhatsApp Chatbot

<img src="https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"> <img src="https://img.shields.io/badge/WhatsApp-Bot-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp"> <img src="https://img.shields.io/badge/AI-Claude%20Sonnet%204-7C4DFF?style=for-the-badge&logo=anthropic&logoColor=white" alt="Claude AI"> <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License">

![GitHub release (latest by date)](https://img.shields.io/github/v/release/el-pablos/ai-whatsapp-chatbot?style=flat-square&color=brightgreen)
![GitHub last commit](https://img.shields.io/github/last-commit/el-pablos/ai-whatsapp-chatbot?style=flat-square)
![GitHub repo size](https://img.shields.io/github/repo-size/el-pablos/ai-whatsapp-chatbot?style=flat-square)
![GitHub top language](https://img.shields.io/github/languages/top/el-pablos/ai-whatsapp-chatbot?style=flat-square)
![GitHub issues](https://img.shields.io/github/issues/el-pablos/ai-whatsapp-chatbot?style=flat-square)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/el-pablos/ai-whatsapp-chatbot/ci.yml?style=flat-square&label=CI)

**AI WhatsApp Chatbot v4.0 — 60 AI tools, 14 handler modul baru, long-term memory, reminder, notes, polling, RSS feeds, QR code, PDF editor, image generation, scheduled messages, dan masih banyak lagi.**

[Fitur](#-fitur-lengkap) · [Instalasi](#-instalasi) · [Arsitektur](#-arsitektur) · [API](#-api--endpoints) · [Kontributor](#-kontributor)

</div>

---

## Deskripsi

ClawBot V4 adalah WhatsApp chatbot all-in-one yang dibangun di atas [Baileys](https://github.com/WhiskeySockets/Baileys) (WhatsApp Web API) dengan AI Claude Sonnet 4 sebagai otak utamanya. Bot ini punya persona unik — ngomong pake bahasa gaul Jakarta, tapi tetep pinter dan bisa bantu macem-macem hal.

**V4.0.0 Highlights:**
- **60 AI-callable tools** — naik dari 26 di v3.1
- **14 handler modul baru** — reminder, memory, notes, translate, GIF, QR, PDF editor, poll, calculator, RSS, image gen, scheduled messages, URL summarizer
- **6 tabel database baru** — long-term memory, reminders, notes, polls, RSS feeds, scheduled messages
- **Long-term memory** — bot bisa ingat preferensi dan fakta user lintas sesi
- **Auto memory capture** — deteksi otomatis info penting dari chat
- **3 cron job** — reminder checker, RSS feed checker, scheduled message sender

---

## Fitur Lengkap

| Kategori | Fitur | Detail |
|----------|-------|--------|
| **AI Chat** | AI-First Orchestrator | Tool-calling architecture: AI decides actions via 60 callable tools (v4.0) |
| **AI Chat** | Conversational AI | Claude Sonnet 4 via Copilot API, persona ClawBot, bahasa gaul Jakarta |
| **AI Chat** | Conversation Memory | SQLite 24-jam context window, 6 bulan retention |
| **AI Chat** | Long-term Memory | Ingat preferensi, fakta, event user lintas sesi (**NEW**) |
| **AI Chat** | Auto Memory Capture | Deteksi otomatis info penting dari chat (**NEW**) |
| **Dokumen** | Universal Reader | 70+ format: PDF, DOCX, XLSX, PPTX, EPUB, ODT, RTF, dll |
| **Dokumen** | Archive Support | ZIP, RAR, 7Z, TAR, GZ — list isi arsip |
| **Dokumen** | Ebook Reader | EPUB, MOBI, AZW, FB2, DJVU |
| **Dokumen** | URL Summarizer | Rangkum konten dari URL website (**NEW**) |
| **Media** | Vision API | Analisis gambar via Claude Vision (describe, OCR, tebak suku) |
| **Media** | Sticker Maker | Bikin sticker dari gambar/video/GIF |
| **Media** | Voice Transcription | Transkripsi voice note via Whisper |
| **Media** | GIF Search | Cari GIF via Tenor/Giphy (**NEW**) |
| **Media** | Image Generation | Generate gambar via DALL-E 3 (**NEW**) |
| **Media** | QR Code Generator | Bikin QR code dari teks/URL (**NEW**) |
| **YouTube** | Video Info | Otomatis detect link YouTube, AI summary info video |
| **YouTube** | MP3 Download | Download audio YouTube (max 30 menit, 50MB) |
| **YouTube** | MP4 Download | Download video YouTube (best quality, 50MB limit) |
| **Web** | Web Search | DuckDuckGo search, auto-detect kapan perlu search |
| **Cuaca** | Weather | Prakiraan cuaca BMKG, info gempa terkini |
| **Lokasi** | Location Search | Cari lokasi via OpenStreetMap/Nominatim |
| **Kalender** | Date Utils | Cek hari libur, konversi tanggal, kalender |
| **Produktivitas** | Reminder | Buat, list, hapus reminder dgn waktu natural language (**NEW**) |
| **Produktivitas** | Notes & Todo | Catatan dan to-do list per user (**NEW**) |
| **Produktivitas** | Translate | Terjemah AI-powered ke 20+ bahasa (**NEW**) |
| **Produktivitas** | Calculator | Evaluasi math, konversi satuan, konversi mata uang (**NEW**) |
| **Produktivitas** | Scheduled Messages | Kirim pesan terjadwal (**NEW**) |
| **Kolaborasi** | Polling | Bikin poll, vote, close dgn visual bar chart (**NEW**) |
| **Kolaborasi** | RSS Feeds | Subscribe, cek update RSS feeds (**NEW**) |
| **Dokumen** | PDF Editor | Merge PDF, extract halaman, info PDF (**NEW**) |
| **Fun** | Tarot Reading | 78-kartu tarot spread lengkap |
| **Fun** | Mood Reader | Analisis mood dari chat |
| **File** | File Creator | Bikin dan kirim file (.md, .txt, .csv, .json, dll) |
| **File** | PPTX Generator | Generate presentasi PowerPoint (.pptx) via AI — Python backend |
| **Infra** | Health Check | Express server `/health`, `/status`, `/dashboard` |
| **Infra** | Auto Setup | Auto-install yt-dlp, ffmpeg, pdftotext, LibreOffice |
| **Infra** | DNS Updater | Auto-update Cloudflare DNS record |
| **Infra** | Auto Backup | Backup database otomatis |
| **Infra** | Bug Reporter | Auto-report error ke owner via WhatsApp |
| **Infra** | Cron Jobs | Reminder checker, RSS checker, scheduled msg sender (**NEW**) |

---

## Arsitektur

### Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Runtime** | Node.js >= 20.0.0 |
| **WhatsApp Client** | @whiskeysockets/baileys |
| **AI Engine** | Claude Sonnet 4 (via Copilot API) |
| **Database** | SQLite (better-sqlite3, WAL mode) — 9 tabel |
| **HTTP Server** | Express 5 |
| **Image Processing** | sharp |
| **Document Parsing** | pdf-parse, mammoth, adm-zip, textract |
| **PDF Editing** | pdf-lib |
| **Math Engine** | mathjs |
| **RSS Parser** | rss-parser |
| **QR Code** | qrcode |
| **Presentation Gen** | python-pptx (Python 3) |
| **Media Tools** | yt-dlp, ffmpeg, fluent-ffmpeg |
| **Process Manager** | PM2 |
| **Testing** | Jest |

### Diagram Arsitektur (v4.0.0 — ClawBot V4)

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
│    ├── Reminder cron (tiap menit)                                   │
│    ├── RSS feed checker (tiap 30 menit)                             │
│    └── Scheduled message sender (tiap menit)                        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
        ┌───────────────────────▼───────────────────────┐
        │            AI-FIRST ORCHESTRATOR               │
        │                                               │
        │  messageNormalizer.js   Baileys → uniform obj │
        │  intentRouter.js       Fast-path + routing    │
        │  promptComposer.js     Context + memory       │
        │  aiOrchestrator.js     Tool-calling loop      │
        │  featureRegistry.js    48+ feature metadata   │
        │  toolRegistry.js       60 AI-callable tools   │
        └───────────────────────┬───────────────────────┘
                                │
  ┌─────────────────────────────┼─────────────────────────────┐
  ▼                             ▼                             ▼
┌──────────────────┐ ┌─────────────────────────┐ ┌──────────────────┐
│  INFRASTRUCTURE  │ │    FEATURE HANDLERS     │ │  EXTERNAL APIs   │
├──────────────────┤ │     (28 modules)        │ ├──────────────────┤
│ database.js      │ ├─────────────────────────┤ │ Copilot API      │
│  └─ SQLite WAL   │ │ EXISTING:               │ │  └─ Claude AI    │
│  └─ 9 tables     │ │  document │ media       │ │  └─ tool_calls   │
│ healthCheck.js   │ │  voice    │ sticker     │ │ DuckDuckGo       │
│  └─ Express:8008 │ │  youtube  │ weather     │ │ BMKG API         │
│ backupHandler.js │ │  webSearch│ location    │ │ OpenStreetMap    │
│ dnsUpdater.js    │ │  tarot    │ mood        │ │ Cloudflare DNS   │
│ capabilities.js  │ │  calendar │ file/pptx   │ │ ExchangeRate API │
│ bugReporter.js   │ │ NEW V4:                 │ │ Tenor/Giphy API  │
│                  │ │  reminder │ memory      │ │ OpenAI DALL-E    │
│                  │ │  note     │ translate   │ │                  │
│                  │ │  gif      │ qrCode      │ │                  │
│                  │ │  pdfEditor│ poll        │ │                  │
│                  │ │  calculator│ rss        │ │                  │
│                  │ │  imageGen │ scheduled   │ │                  │
│                  │ │  urlSummarizer          │ │                  │
└──────────────────┘ └─────────────────────────┘ └──────────────────┘
```

### Flowchart Message Processing (v4.0.0)

```
                    ┌───────────────────────┐
                    │  User kirim pesan WA  │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │   bot.js menerima     │
                    │   messages.upsert     │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │  Dedup check (msgId   │
                    │  + content hash)      │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │  normalizeMessage()   │
                    │  Baileys proto →      │
                    │  { type, text, media }│
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │  routeMessage()       │
                    │  intentRouter.js      │
                    └───────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                                   │
    ┌─────────▼──────────┐             ┌──────────▼──────────┐
    │ Fast-path command? │             │ AI Orchestrator     │
    │ (.s, .mp3, .mp4,   │             │ aiOrchestrator.js   │
    │  .tarot, .mood)    │             └──────────┬──────────┘
    └─────────┬──────────┘                        │
              │                        ┌──────────▼──────────┐
              │                        │ promptComposer →    │
              │                        │ Claude API call     │
              │                        │ with tools[] array  │
              │                        └──────────┬──────────┘
              │                                   │
              │                        ┌──────────▼──────────┐
              │                        │ tool_calls loop:    │
              │                        │ executeTool() →     │
              │                        │ feed result back →  │
              │                        │ next AI response    │
              │                        └──────────┬──────────┘
              │                                   │
              └───────────────┬───────────────────┘
                              │
                   ┌──────────▼──────────┐
                   │  Kirim respons ke   │
                   │  user via WhatsApp  │
                   └──────────┬──────────┘
                              │
                   ┌──────────▼──────────┐
                   │  Simpan respons ke  │
                   │  database (memory)  │
                   └─────────────────────┘
```

### Entity Relationship Diagram (ERD) — 9 Tables

```
┌─────────────────────────────────────┐
│            conversations            │
├─────────────────────────────────────┤
│ id            INTEGER PK AUTOINCR   │
│ chat_id       TEXT NOT NULL         │──┐
│ sender_jid    TEXT NOT NULL         │──┤
│ sender_name   TEXT                  │  │
│ role          TEXT NOT NULL         │  │    ┌──────────────────────────┐
│   CHECK (user|assistant|system)     │  │    │     user_profiles       │
│ content       TEXT NOT NULL         │  │    ├──────────────────────────┤
│ message_id    TEXT                  │  ├───>│ jid         TEXT PK      │
│ quoted_message_id TEXT              │  │    │ name        TEXT         │
│ quoted_content    TEXT              │  │    │ first_seen  INTEGER      │
│ media_type    TEXT                  │  │    │ last_seen   INTEGER      │
│ media_caption TEXT                  │  │    │ message_count INTEGER    │
│ timestamp     INTEGER NOT NULL      │  │    │ metadata    TEXT         │
│ created_at    DATETIME DEFAULT NOW  │  │    └──────────────────────────┘
├─────────────────────────────────────┤  │
│ IDX: chat_id, timestamp, message_id │  │    ┌──────────────────────────┐
└─────────────────────────────────────┘  │    │   user_preferences       │
                                         │    ├──────────────────────────┤
                                         └───>│ jid            TEXT PK   │
                                              │ preferred_name TEXT      │
                                              │ language       TEXT      │
                                              │ response_style TEXT      │
                                              │ is_owner       INTEGER   │
                                              │ custom_settings TEXT     │
                                              │ updated_at     INTEGER   │
                                              ├──────────────────────────┤
                                              │ IDX: jid                 │
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

# 4. Install Python dependencies (untuk PPTX generation)
pip install -r tools/requirements.txt

# 5. Start bot
node src/bot.js

# 6. Scan QR code yang muncul di terminal dengan WhatsApp HP
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
LOG_LEVEL=info                           # Level logging (debug/info/warn/error)
NODE_ENV=production
```

---

## API & Endpoints

Health check server berjalan di port `8008`:

| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/health` | GET | Health check sederhana |
| `/status` | GET | Status koneksi WhatsApp |
| `/stats` | GET | Statistik database |
| `/dashboard` | GET | Dashboard HTML lengkap |
| `/capabilities` | GET | Daftar dependency dan status |
| `/users` | GET | Daftar user yang pernah chat |

---

## Struktur Projek

```
ai-whatsapp-chatbot/
├── src/
│   ├── bot.js                 # Entry point + Baileys lifecycle + cron jobs
│   ├── featureRegistry.js     # 48+ feature metadata registry
│   ├── toolRegistry.js        # 60 AI-callable tools + executeTool
│   ├── messageNormalizer.js   # Baileys proto → uniform message obj
│   ├── promptComposer.js      # Context + memory prompt builder
│   ├── aiOrchestrator.js      # Tool-calling loop + retry logic
│   ├── intentRouter.js        # Fast-path commands + AI routing
│   ├── aiHandler.js           # AI chat via Claude Sonnet 4
│   ├── autoSetup.js           # Auto-install dependencies
│   ├── backupHandler.js       # Database backup
│   ├── bugReporter.js         # Auto bug report ke owner
│   ├── calculatorHandler.js   # Math eval, unit convert, currency [v4.0]
│   ├── calendarHandler.js     # Kalender & hari libur
│   ├── capabilities.js        # Dependency registry
│   ├── database.js            # SQLite 9 tabel, WAL mode
│   ├── dnsUpdater.js          # Cloudflare DNS automation
│   ├── documentHandler.js     # Universal document reader (70+ format)
│   ├── errorUtils.js          # Error handling utilities
│   ├── fileCreator.js         # Create & send files
│   ├── gifHandler.js          # GIF search (Tenor/Giphy) [v4.0]
│   ├── healthCheck.js         # Express health check server
│   ├── imageGenHandler.js     # DALL-E 3 image generation [v4.0]
│   ├── locationHandler.js     # Location search (OpenStreetMap)
│   ├── mediaHandler.js        # Image/media + Vision API
│   ├── memoryHandler.js       # Long-term memory CRUD [v4.0]
│   ├── messageUtils.js        # Message formatting helpers
│   ├── moodHandler.js         # Mood analysis
│   ├── noteHandler.js         # Notes & to-do list [v4.0]
│   ├── pdfEditorHandler.js    # PDF merge/extract/info [v4.0]
│   ├── pollHandler.js         # Polling system [v4.0]
│   ├── pptxHandler.js         # PPTX generation (python-pptx)
│   ├── pythonRunner.js        # Python script runner
│   ├── qrCodeHandler.js       # QR code generator [v4.0]
│   ├── reminderHandler.js     # Reminder system [v4.0]
│   ├── rssHandler.js          # RSS feed subscriber [v4.0]
│   ├── scheduledMessageHandler.js  # Scheduled messages [v4.0]
│   ├── stickerHandler.js      # Sticker maker (ffmpeg)
│   ├── tarotHandler.js        # 78-kartu tarot reading
│   ├── translateHandler.js    # AI-powered translation [v4.0]
│   ├── urlSummarizerHandler.js # URL content summarizer [v4.0]
│   ├── userProfileHelper.js   # User classification
│   ├── voiceHandler.js        # Voice transcription (Whisper)
│   ├── weatherHandler.js      # BMKG weather & gempa
│   ├── webSearchHandler.js    # DuckDuckGo web search
│   └── youtubeHandler.js      # YouTube download (yt-dlp)
├── tools/
│   ├── pptx_generator.py      # Python PPTX generator script
│   └── requirements.txt       # Python dependencies
├── tests/                     # Jest test suites (1251 tests, 39 suites)
├── scripts/
│   ├── bootstrap.sh           # Setup script
│   ├── doctor.js              # Dependency health check
│   └── start.sh               # Start script
├── .github/
│   └── workflows/
│       ├── ci.yml             # CI pipeline (test + security audit)
│       └── release.yml        # Auto-release & tagging
├── data/                      # SQLite database (gitignored)
├── downloads/                 # YouTube downloads (gitignored)
├── auth_info_baileys/         # WhatsApp auth (gitignored)
├── package.json
├── ecosystem.config.js        # PM2 configuration
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

**Test Coverage:** 1251 tests across 39 test suites.

---

## Security

Projek ini menerapkan beberapa praktik keamanan:

- **No shell injection** — Semua command execution menggunakan `execFile()` / `execFileAsync()` dengan array argument, bukan template string ke shell. Ini mencegah command injection dari user input.
- **Parameterized SQL** — Semua query database menggunakan prepared statements dengan placeholder `?`.
- **Input validation** — YouTube video ID divalidasi via regex `[a-zA-Z0-9_-]{11}`, document extension divalidasi via whitelist.
- **File sanitization** — Filename disanitasi sebelum digunakan di file operations.
- **Dependency audit** — CI pipeline menjalankan `npm audit` di setiap push.

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
