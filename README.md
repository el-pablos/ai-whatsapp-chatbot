<div align="center">

# Tama AI — WhatsApp Chatbot

<img src="https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"> <img src="https://img.shields.io/badge/WhatsApp-Bot-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp"> <img src="https://img.shields.io/badge/AI-Claude%20Sonnet-7C4DFF?style=for-the-badge&logo=anthropic&logoColor=white" alt="Claude AI"> <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License">

![GitHub release (latest by date)](https://img.shields.io/github/v/release/el-pablos/ai-whatsapp-chatbot?style=flat-square&color=brightgreen)
![GitHub last commit](https://img.shields.io/github/last-commit/el-pablos/ai-whatsapp-chatbot?style=flat-square)
![GitHub repo size](https://img.shields.io/github/repo-size/el-pablos/ai-whatsapp-chatbot?style=flat-square)
![GitHub top language](https://img.shields.io/github/languages/top/el-pablos/ai-whatsapp-chatbot?style=flat-square)
![GitHub issues](https://img.shields.io/github/issues/el-pablos/ai-whatsapp-chatbot?style=flat-square)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/el-pablos/ai-whatsapp-chatbot/ci.yml?style=flat-square&label=CI)

**AI WhatsApp Chatbot dengan persona "Tama" — chatbot pinter yang bisa baca 70+ format dokumen, download YouTube, analisis gambar, cari di web, dan ngobrol santai pake bahasa gaul Jakarta.**

[Fitur](#-fitur-lengkap) · [Instalasi](#-instalasi) · [Arsitektur](#-arsitektur) · [API](#-api--endpoints) · [Kontributor](#-kontributor)

</div>

---

## Deskripsi

Tama AI adalah WhatsApp chatbot all-in-one yang dibangun di atas [Baileys](https://github.com/WhiskeySockets/Baileys) (WhatsApp Web API) dengan integrasi AI Claude Sonnet sebagai otak utamanya. Bot ini punya persona unik — ngomong pake bahasa gaul Jakarta, tapi tetep pinter dan bisa bantu macem-macem hal mulai dari baca dokumen sampe download video YouTube.

Semua percakapan disimpan di SQLite dengan context window 24 jam, jadi Tama bisa "ingat" obrolan sebelumnya dan ngasih respons yang nyambung. Support 70+ format dokumen, Vision API buat analisis gambar, web search, prakiraan cuaca BMKG, lokasi via OpenStreetMap, dan masih banyak lagi.

---

## Fitur Lengkap

| Kategori | Fitur | Detail |
|----------|-------|--------|
| **AI Chat** | Conversational AI | Claude Sonnet via Copilot API, persona Tama, bahasa gaul Jakarta |
| **AI Chat** | Conversation Memory | SQLite 24-jam context window, 6 bulan retention |
| **AI Chat** | User Preferences | Auto-detect nickname, bahasa, gaya respons |
| **Dokumen** | Universal Reader | 70+ format: PDF, DOCX, XLSX, PPTX, EPUB, ODT, RTF, dll |
| **Dokumen** | Archive Support | ZIP, RAR, 7Z, TAR, GZ — list isi arsip |
| **Dokumen** | Ebook Reader | EPUB, MOBI, AZW, FB2, DJVU |
| **Media** | Vision API | Analisis gambar via Claude Vision (describe, OCR, tebak suku) |
| **Media** | Sticker Maker | Bikin sticker dari gambar/video/GIF |
| **Media** | Voice Transcription | Transkripsi voice note via Whisper |
| **YouTube** | Video Info | Otomatis detect link YouTube, AI summary info video |
| **YouTube** | MP3 Download | Download audio YouTube (max 30 menit, 50MB) |
| **YouTube** | MP4 Download | Download video YouTube (best quality, 50MB limit) |
| **Web** | Web Search | DuckDuckGo search, auto-detect kapan perlu search |
| **Cuaca** | Weather | Prakiraan cuaca BMKG, info gempa terkini |
| **Lokasi** | Location Search | Cari lokasi via OpenStreetMap/Nominatim |
| **Kalender** | Date Utils | Cek hari libur, konversi tanggal, kalender |
| **Fun** | Tarot Reading | 78-kartu tarot spread lengkap |
| **Fun** | Mood Reader | Analisis mood dari chat |
| **File** | File Creator | Bikin dan kirim file (.md, .txt, .csv, .json, dll) |
| **Infra** | Health Check | Express server `/health`, `/status`, `/dashboard` |
| **Infra** | Auto Setup | Auto-install yt-dlp, ffmpeg, pdftotext, LibreOffice |
| **Infra** | DNS Updater | Auto-update Cloudflare DNS record |
| **Infra** | Auto Backup | Backup database otomatis |
| **Infra** | Bug Reporter | Auto-report error ke owner via WhatsApp |

---

## Arsitektur

### Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Runtime** | Node.js >= 20.0.0 |
| **WhatsApp Client** | @whiskeysockets/baileys |
| **AI Engine** | Claude Sonnet 4.5 (via Copilot API) |
| **Database** | SQLite (better-sqlite3, WAL mode) |
| **HTTP Server** | Express 5 |
| **Image Processing** | sharp |
| **Document Parsing** | pdf-parse, mammoth, adm-zip, textract |
| **Media Tools** | yt-dlp, ffmpeg, fluent-ffmpeg |
| **Process Manager** | PM2 |
| **Testing** | Jest |

### Diagram Arsitektur

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
│          Baileys client → QR/Pairing auth → Message listener        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  INFRASTRUCTURE  │ │  MESSAGE ROUTER  │ │  EXTERNAL APIs   │
├──────────────────┤ │   (bot.js core)  │ ├──────────────────┤
│ database.js      │ │                  │ │ Copilot API      │
│  └─ SQLite WAL   │ │ Routing logic:   │ │  └─ Claude AI    │
│ healthCheck.js   │ │  → media?        │ │ DuckDuckGo       │
│  └─ Express:8008 │ │  → document?     │ │ BMKG API         │
│ capabilities.js  │ │  → youtube?      │ │ OpenStreetMap    │
│ bugReporter.js   │ │  → sticker?      │ │ Cloudflare DNS   │
│ backupHandler.js │ │  → voice?        │ │ ipify            │
│ dnsUpdater.js    │ │  → text → AI     │ └──────────────────┘
└──────────────────┘ └────────┬─────────┘
                              │
        ┌──────────┬──────────┼──────────┬──────────┐
        ▼          ▼          ▼          ▼          ▼
  ┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐
  │  MEDIA   ││    AI    ││ CONTENT  ││  UTILS   ││   FUN    │
  │ HANDLERS ││ HANDLERS ││ HANDLERS ││ HANDLERS ││ HANDLERS │
  ├──────────┤├──────────┤├──────────┤├──────────┤├──────────┤
  │document  ││aiHandler ││youtube   ││fileCreatr││tarot     │
  │media     ││webSearch ││weather   ││messageUtl││mood      │
  │voice     ││          ││location  ││userProfil││calendar  │
  │sticker   ││          ││calendar  ││errorUtils││          │
  └──────────┘└──────────┘└──────────┘└──────────┘└──────────┘
```

### Flowchart Message Processing

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
                    │  Simpan ke database   │
                    │  (saveMessage)        │
                    └───────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
    ┌─────────▼──────┐ ┌───────▼───────┐ ┌───────▼──────┐
    │ Media message?  │ │ YouTube URL?  │ │ Text message │
    │ (img/doc/voice) │ │               │ │              │
    └────────┬───────┘ └───────┬───────┘ └──────┬───────┘
             │                 │                 │
    ┌────────▼───────┐ ┌───────▼───────┐ ┌──────▼───────┐
    │ Route ke:      │ │ getVideoInfo  │ │ AI Handler   │
    │ • imageHandler │ │ → AI analysis │ │ (Claude API) │
    │ • docHandler   │ │ → format pick │ │              │
    │ • voiceHandler │ │ → download    │ │ Cek trigger: │
    │ • stickerMaker │ └───────────────┘ │ • webSearch  │
    └────────────────┘                   │ • fileCreate │
                                         │ • tarot      │
                                         │ • weather    │
                                         └──────┬───────┘
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

### Entity Relationship Diagram (ERD)

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
```

---

## Instalasi

### Prasyarat

- **Node.js** >= 20.0.0
- **npm** >= 9
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
node src/bot.js

# 4. Scan QR code yang muncul di terminal dengan WhatsApp HP
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
COPILOT_API_MODEL=claude-sonnet-4.5     # Model AI yang dipakai

# === WhatsApp Auth ===
WA_AUTH_METHOD=qr                        # 'qr' atau 'pairing'
WA_PHONE_NUMBER=628xxx                   # Nomor HP (untuk pairing mode)

# === Database ===
DB_PATH=./data/chat_memory.db            # Path database SQLite
SESSION_EXPIRY_HOURS=24                  # Context window AI (jam)
RETENTION_MONTHS=6                       # Retention data (bulan)

# === Auto Setup ===
AUTO_GIT_PULL=1                          # Auto git pull saat boot
AUTOSETUP_INSTALL_LIBREOFFICE=0          # Auto-install LibreOffice

# === Cloudflare DNS (optional) ===
CF_ZONE_ID=xxx
CF_DNS_API_TOKEN=xxx
CF_TARGET_DOMAIN=bot.example.com

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
│   ├── bot.js                 # Entry point utama (2400+ baris)
│   ├── aiHandler.js           # AI chat via Claude Sonnet
│   ├── autoSetup.js           # Auto-install dependencies
│   ├── backupHandler.js       # Database backup
│   ├── bugReporter.js         # Auto bug report ke owner
│   ├── calendarHandler.js     # Kalender & hari libur
│   ├── capabilities.js        # Dependency registry
│   ├── database.js            # SQLite conversation memory
│   ├── dnsUpdater.js          # Cloudflare DNS automation
│   ├── documentHandler.js     # Universal document reader (70+ format)
│   ├── errorUtils.js          # Error handling utilities
│   ├── fileCreator.js         # Create & send files
│   ├── healthCheck.js         # Express health check server
│   ├── locationHandler.js     # Location search (OpenStreetMap)
│   ├── mediaHandler.js        # Image/media + Vision API
│   ├── messageUtils.js        # Message formatting helpers
│   ├── moodHandler.js         # Mood analysis
│   ├── stickerHandler.js      # Sticker maker (ffmpeg)
│   ├── tarotHandler.js        # 78-kartu tarot reading
│   ├── userProfileHelper.js   # User classification
│   ├── voiceHandler.js        # Voice transcription (Whisper)
│   ├── weatherHandler.js      # BMKG weather & gempa
│   ├── webSearchHandler.js    # DuckDuckGo web search
│   └── youtubeHandler.js      # YouTube download (yt-dlp)
├── tests/                     # Jest test suites (696 tests)
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

**Test Coverage:** 696 tests across 18 test suites.

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
