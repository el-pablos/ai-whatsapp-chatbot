<p align="center">
  <img src="https://raw.githubusercontent.com/el-pablos/ai-whatsapp-chatbot/master/.github/assets/tama-banner.png" alt="Tama AI Bot" width="600"/>
</p>

<h1 align="center">
  🤖 Tama AI WhatsApp Bot v2.3
</h1>

<p align="center">
  <strong>AI-powered WhatsApp chatbot dengan kepribadian manusia Indonesia yang natural dan relatable</strong>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-configuration">Configuration</a> •
  <a href="#-usage">Usage</a> •
  <a href="#-api-integration">API</a> •
  <a href="#-testing">Testing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.3.0-blue.svg?style=for-the-badge" alt="Version"/>
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg?style=for-the-badge&logo=node.js" alt="Node"/>
  <img src="https://img.shields.io/badge/documents-70%2B%20formats-orange.svg?style=for-the-badge" alt="Documents"/>
  <img src="https://img.shields.io/badge/AI-100%25%20Integrated-success.svg?style=for-the-badge" alt="AI"/>
  <img src="https://img.shields.io/badge/license-MIT-purple.svg?style=for-the-badge" alt="License"/>
</p>

<br/>

---

## ✨ Overview

**Tama AI Bot** adalah WhatsApp chatbot yang menggunakan AI untuk berkomunikasi dengan gaya bicara anak muda Indonesia yang natural. Tidak seperti chatbot formal pada umumnya, Tama punya kepribadian yang relatable - suka ngeluh, pake bahasa gaul, typo dikit-dikit, dan tetep helpful.

<details>
<summary><b>🎭 Kenapa Tama Beda?</b></summary>

<br/>

| Chatbot Biasa | Tama AI |
|---------------|---------|
| "Baik, saya akan membantu Anda" | "okei bro, bentar w cek dulu ya" |
| "Terima kasih telah menghubungi" | "sip sip, sama-sama jir 😎" |
| "Maaf, saya tidak mengerti" | "wah gatau w soal itu bro 😅" |
| Formal & Kaku | Casual & Natural |
| Customer Service Style | Temen Ngobrol Style |

</details>

---

## 🚀 Features

### 💬 AI Chat dengan Persona Natural
- **Gaya Bicara Jakarta** - Pakai bahasa gaul, slang, dan idiom lokal
- **Natural Typo** - Typo intentional kayak manusia beneran
- **Emoji Ekspresif** - Biar chat lebih hidup 🔥
- **Sarcasm & Humor** - Bisa ngeluh, sarcasm, dan jokes
- **Context Aware** - Paham konteks percakapan sebelumnya

### 🧠 Memory & Context
- **Unlimited History** - SQLite database untuk menyimpan semua percakapan
- **Reply Awareness** - Paham pesan yang di-reply
- **Multi-session** - Support chat berbeda-beda
- **Persistent Auth** - Sekali pair, ga perlu auth ulang

### 👁️ Vision & Image Understanding
- **Image Analysis** - Bisa liat dan pahami gambar
- **Screenshot Reading** - Baca teks dari screenshot
- **Meme Understanding** - Paham meme dan context visual
- **Ethnicity Detection** - Fun feature tebak suku dari foto

### 📄 Universal Document Reader (70+ Formats!)

**TANPA BATAS SIZE atau TEXT LENGTH!** Semua dokumen diproses 100% dengan AI.

<details>
<summary><b>📋 Supported Formats</b></summary>

#### 📝 Office Documents
| Format | Extension | Description |
|--------|-----------|-------------|
| Microsoft Word | `.doc`, `.docx`, `.docm` | Word documents |
| Word Templates | `.dot`, `.dotx` | Word templates |
| OpenDocument | `.odt` | LibreOffice/OpenOffice |
| Rich Text | `.rtf` | Rich Text Format |
| WordPerfect | `.wpd`, `.wps` | WordPerfect docs |
| AbiWord | `.abw`, `.zabw` | AbiWord documents |
| Lotus | `.lwp` | Lotus Word Pro |
| Hangul | `.hwp` | Korean Hangul |
| Apple Pages | `.pages` | Apple Pages |

#### 📊 Spreadsheets
| Format | Extension | Description |
|--------|-----------|-------------|
| Microsoft Excel | `.xls`, `.xlsx`, `.xlsm` | Excel spreadsheets |
| OpenDocument | `.ods` | LibreOffice Calc |
| CSV/TSV | `.csv`, `.tsv` | Plain text data |

#### 📽️ Presentations
| Format | Extension | Description |
|--------|-----------|-------------|
| PowerPoint | `.ppt`, `.pptx`, `.pptm` | PowerPoint slides |
| PowerPoint Show | `.ppsx`, `.pps` | Slide shows |
| Templates | `.pot`, `.potx` | PowerPoint templates |
| OpenDocument | `.odp` | LibreOffice Impress |
| Keynote | `.key` | Apple Keynote |
| WPS Office | `.dps` | WPS Presentation |

#### 📚 Ebooks
| Format | Extension | Description |
|--------|-----------|-------------|
| EPUB | `.epub` | Standard ebook format |
| Kindle | `.mobi`, `.azw`, `.azw3`, `.azw4` | Amazon Kindle |
| FictionBook | `.fb2` | FictionBook format |
| Microsoft LIT | `.lit` | MS Reader |
| Sony Reader | `.lrf` | Sony ebook |
| Palm | `.pdb`, `.pml`, `.prc` | Palm devices |
| Other | `.rb`, `.snb`, `.tcr`, `.txtz` | Various ebook formats |
| CHM | `.chm` | Compiled HTML Help |
| DjVu | `.djvu`, `.djv` | Scanned documents |

#### 📦 Comics
| Format | Extension | Description |
|--------|-----------|-------------|
| Comic RAR | `.cbr` | RAR-compressed comics |
| Comic ZIP | `.cbz` | ZIP-compressed comics |
| Comic TAR | `.cbc` | TAR-compressed comics |

#### 🌐 Web Formats
| Format | Extension | Description |
|--------|-----------|-------------|
| HTML | `.html`, `.htm` | Web pages |
| XHTML | `.xhtml` | XHTML documents |
| MHTML | `.mhtml`, `.mht` | Web archives |
| HTML-ZIP | `.htmlz` | Zipped HTML |

#### 📁 Archives
| Format | Extension | Description |
|--------|-----------|-------------|
| ZIP | `.zip` | Standard ZIP |
| RAR | `.rar` | WinRAR archive |
| 7-Zip | `.7z` | 7-Zip archive |
| TAR | `.tar` | Tape archive |
| GZIP | `.gz`, `.tgz` | Gzip compressed |
| BZIP2 | `.bz2`, `.tbz`, `.tbz2` | Bzip2 compressed |
| XZ | `.xz`, `.txz` | XZ compressed |
| Other | `.lzo`, `.z`, `.rz` | Other compression |

#### 📄 Plain Text
| Format | Extension | Description |
|--------|-----------|-------------|
| Text | `.txt` | Plain text |
| Markdown | `.md`, `.markdown` | Markdown |
| reStructuredText | `.rst` | RST docs |
| LaTeX | `.tex` | LaTeX documents |
| Logs | `.log` | Log files |
| Config | `.ini`, `.cfg`, `.conf` | Config files |
| Data | `.json`, `.xml`, `.yaml`, `.yml` | Structured data |

</details>

### 🎵 YouTube Downloader
- **Auto-detect** - Langsung detect YouTube URL
- **MP3 Download** - Convert ke audio MP3
- **MP4 Download** - Download video dengan kualitas terbaik
- **AI Summary** - Analisis konten video dengan AI

### 📍 Location Sharing
- **Place Search** - Cari tempat pakai OpenStreetMap
- **Location Messages** - Kirim lokasi langsung ke chat
- **Multiple Results** - Tampilkan beberapa hasil pencarian
- **Maps Integration** - Link ke Google Maps / Apple Maps

### 📅 Calendar & Holiday
- **Date Check** - Cek hari libur/tanggal penting
- **Holiday Awareness** - Tau libur nasional Indonesia
- **Event Detection** - Deteksi event/perayaan

### 🔮 Mood & Tarot Reading
- **Mood Analysis** - Analisis mood dari chat
- **78-Card Tarot** - Complete tarot deck
- **Multiple Spreads** - Single card, 3 cards, Celtic Cross, dll
- **AI Interpretation** - Interpretasi tarot dengan AI

### 🛠️ Infrastructure
- **Health Check Server** - HTTP endpoint untuk monitoring
- **Cloudflare DNS** - Auto-update DNS record
- **PM2 Integration** - Process management
- **Auto Reconnect** - Handle disconnect otomatis
- **Persistent Auth** - Auth tersimpan permanen

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Runtime** | Node.js 18+ |
| **WhatsApp** | @whiskeysockets/baileys v7.0.0 |
| **AI Backend** | Copilot API (Claude claude-sonnet-4.5) |
| **Database** | SQLite (better-sqlite3) |
| **Process Manager** | PM2 |
| **Document Processing** | LibreOffice, Calibre, Pandoc |
| **YouTube** | yt-dlp |
| **Testing** | Jest |

---

## 📦 Installation

### Prerequisites

```bash
# Node.js 18+
node --version  # Should be >= 18.0.0

# System dependencies (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y \
    libreoffice-common \
    libreoffice-writer \
    calibre \
    pandoc \
    p7zip-full \
    unrar \
    antiword \
    catdoc \
    poppler-utils \
    djvulibre-bin \
    ffmpeg
```

### Quick Start

```bash
# Clone repository
git clone https://github.com/el-pablos/ai-whatsapp-chatbot.git
cd ai-whatsapp-chatbot

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Start the bot
npm start

# Or with PM2
pm2 start ecosystem.config.js
```

---

## ⚙️ Configuration

### Environment Variables (.env)

```env
# AI API Configuration
COPILOT_API_URL=http://localhost:4141/v1/chat/completions
LOG_LEVEL=info

# WhatsApp Auth
WA_AUTH_METHOD=pairing  # 'pairing' atau 'qr'
WA_PHONE_NUMBER=628xxx  # Nomor untuk pairing code

# Cloudflare (optional)
CLOUDFLARE_API_TOKEN=your_token
CLOUDFLARE_ZONE_ID=your_zone_id
CLOUDFLARE_RECORD_NAME=your_record_name

# Health Check
HEALTH_CHECK_PORT=3000
```

### PM2 Configuration

```bash
# Start all services
pm2 start ecosystem.config.js

# View status
pm2 status

# View logs
pm2 logs wa-tama-bot

# Restart bot
pm2 restart wa-tama-bot
```

---

## 📱 Usage

### First Time Setup (Pairing Code)

1. Set `WA_AUTH_METHOD=pairing` dan `WA_PHONE_NUMBER` di `.env`
2. Start bot: `npm start`
3. Bot akan generate pairing code
4. Buka WhatsApp > Linked Devices > Link a Device
5. Pilih "Link with phone number instead"
6. Masukkan pairing code yang ditampilkan

### Chat Commands

| Command | Description |
|---------|-------------|
| *halo/hai* | Mulai chat dengan Tama |
| *kirim gambar* | Tama analisis gambar |
| *kirim dokumen* | Tama baca & analisis dokumen |
| *[YouTube URL]* | Download sebagai MP3/MP4 |
| *cariin [tempat]* | Cari lokasi tempat |
| *hari ini tanggal berapa* | Info kalender & libur |
| *baca mood gw* | Analisis mood dari chat |
| *tarot gw* | Tarot reading |
| *tebak suku* | + foto = tebak suku |

### Document Analysis Example

```
User: [kirim PDF buku 500 halaman]
Tama: 📄 *File:* buku-tebal.pdf
      📊 *Tipe:* PDF Document
      📏 *Ukuran:* 2.5 MB (485,000 karakter)
      
      🔍 *Overview:*
      Ini buku tentang [ringkasan konten]...
      
      📋 *Detail Penting:*
      - Chapter 1: ...
      - Chapter 2: ...
      
      💡 *Insight:*
      Menurut gw sih buku ini [analisis AI]...
```

---

## 🔌 API Integration

### Copilot API

Bot menggunakan Copilot API untuk AI responses. Default: `localhost:4141`

```javascript
// Request format
POST /v1/chat/completions
{
  "model": "claude-sonnet-4-20250514",
  "messages": [...],
  "max_tokens": 4000,
  "temperature": 0.7
}
```

### Vision API

Untuk image understanding, bot menggunakan endpoint yang sama dengan image base64:

```javascript
// Image message format
{
  "role": "user",
  "content": [
    { "type": "text", "text": "Analisis gambar ini" },
    { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,..." }}
  ]
}
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test
npm test -- --testPathPattern=documentHandler
```

### Test Coverage

| Module | Coverage |
|--------|----------|
| aiHandler | 85% |
| documentHandler | 90% |
| calendarHandler | 95% |
| moodHandler | 88% |
| tarotHandler | 92% |
| youtubeHandler | 85% |

---

## 📁 Project Structure

```
ai-whatsapp-chatbot/
├── src/
│   ├── bot.js              # Main bot entry point
│   ├── aiHandler.js        # AI/Copilot API handler
│   ├── documentHandler.js  # Universal document reader (70+ formats)
│   ├── youtubeHandler.js   # YouTube downloader
│   ├── mediaHandler.js     # Image/media processing
│   ├── locationHandler.js  # Location/maps features
│   ├── calendarHandler.js  # Calendar & holiday
│   ├── moodHandler.js      # Mood analysis
│   ├── tarotHandler.js     # Tarot reading (78 cards)
│   ├── messageUtils.js     # Message chunking utility
│   ├── database.js         # SQLite database
│   ├── healthCheck.js      # Health check server
│   └── dnsUpdater.js       # Cloudflare DNS updater
├── tests/
│   └── *.test.js           # Unit tests
├── auth_info_baileys/      # WhatsApp auth (persist!)
├── data/
│   └── media/              # Downloaded media
├── logs/                   # PM2 logs
├── ecosystem.config.js     # PM2 configuration
├── package.json
└── README.md
```

---

## 🔧 Troubleshooting

### Auth Issues

```bash
# Jika perlu re-auth, hapus folder auth:
rm -rf auth_info_baileys

# Restart bot untuk dapat pairing code baru
pm2 restart wa-tama-bot
```

### Document Processing Issues

```bash
# Check if LibreOffice installed
libreoffice --version

# Check if Calibre installed
ebook-convert --version

# Test PDF extraction
pdftotext -v
```

### Connection Issues

```bash
# Check logs
pm2 logs wa-tama-bot --lines 100

# Check Copilot API
curl http://localhost:4141/v1/models
```

---

## 📜 Changelog

### v2.3.0 (Latest)
- ✨ **Universal Document Reader** - Support 70+ document formats
- ✨ **No Size Limits** - Baca dokumen berapapun ukurannya
- ✨ **Archive Support** - Baca isi ZIP, RAR, 7z, TAR, dll
- 🔧 **Improved Auth** - Auth persist across restarts
- 🔧 **Better Error Handling** - Lebih robust error handling

### v2.2.0
- ✨ YouTube Downloader (MP3/MP4)
- ✨ Basic PDF/DOCX reading

### v2.1.0
- ✨ Message chunking for long responses
- ✨ Tarot reading (78 cards)
- ✨ Mood analysis

### v2.0.0
- ✨ Vision API integration
- ✨ SQLite memory
- ✨ Location sharing
- ✨ Calendar features

---

## 🤝 Contributing

1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file

---

## 👨‍💻 Author

**Tama El Pablo** ([@el-pablos](https://github.com/el-pablos))

---

<p align="center">
  <b>🔥 Built with ❤️ and lots of ☕</b>
</p>

<p align="center">
  <i>"Santai aja bro, bot ini bisa handle semua dokumen lo tanpa batas!" 😎</i>
</p>
