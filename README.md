<p align="center">
  <img src="https://raw.githubusercontent.com/el-pablos/ai-whatsapp-chatbot/master/.github/assets/tama-banner.png" alt="Tama AI Bot" width="600"/>
</p>

<h1 align="center">
  🤖 Tama AI WhatsApp Bot
</h1>

<p align="center">
  <strong>AI-powered WhatsApp chatbot dengan kepribadian manusia Indonesia yang natural dan relatable</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#installation">Installation</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#usage">Usage</a> •
  <a href="#api">API</a> •
  <a href="#testing">Testing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.1.0-blue.svg?style=for-the-badge" alt="Version"/>
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg?style=for-the-badge&logo=node.js" alt="Node"/>
  <img src="https://img.shields.io/badge/tests-103%20passing-success.svg?style=for-the-badge" alt="Tests"/>
  <img src="https://img.shields.io/badge/coverage-84%25-yellow.svg?style=for-the-badge" alt="Coverage"/>
  <img src="https://img.shields.io/badge/license-MIT-purple.svg?style=for-the-badge" alt="License"/>
</p>

<br/>

---

<br/>

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

<br/>

---

<br/>

## 🚀 Features

<table>
<tr>
<td width="50%">

### 💬 AI Chat dengan Persona
- Gaya bicara anak muda Jakarta
- Pakai bahasa gaul & slang
- Natural typo (kayak manusia)
- Emoji ekspresif
- Bisa ngeluh & sarcasm

</td>
<td width="50%">

### 🧠 Memory & Context
- Unlimited chat history (SQLite)
- Reply/quoted message awareness
- 24-hour session expiry
- Context-aware responses

</td>
</tr>
<tr>
<td width="50%">

### 👁️ Vision & Media
- Image understanding (Vision API)
- Document analysis
- Ethnicity detection (fun feature)
- Media caption analysis

</td>
<td width="50%">

### 📍 Location Features
- Location sharing via OpenStreetMap
- Place search & directions
- Incoming location detection
- Maps integration

</td>
</tr>
<tr>
<td width="50%">

### 📅 Calendar & Schedule
- Indonesian calendar view
- National holiday checker
- Zodiac calculator
- Birthday countdown
- Natural language date parsing

</td>
<td width="50%">

### 🛡️ Infrastructure
- Auto reconnect handling
- Health check server
- Cloudflare DNS automation
- PM2 process management
- Comprehensive logging

</td>
</tr>
</table>

<br/>

---

<br/>

## 🛠️ Tech Stack

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Baileys-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="Baileys"/>
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite"/>
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express"/>
  <img src="https://img.shields.io/badge/Claude_AI-191919?style=for-the-badge&logo=anthropic&logoColor=white" alt="Claude"/>
  <img src="https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white" alt="Jest"/>
  <img src="https://img.shields.io/badge/PM2-2B037A?style=for-the-badge&logo=pm2&logoColor=white" alt="PM2"/>
  <img src="https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare"/>
</p>

| Component | Technology |
|-----------|------------|
| **Runtime** | Node.js 18+ |
| **WhatsApp Client** | @whiskeysockets/baileys v7 |
| **AI Model** | Claude Sonnet 4.5 via Copilot API |
| **Database** | SQLite (better-sqlite3) |
| **Web Server** | Express.js |
| **Process Manager** | PM2 |
| **DNS Management** | Cloudflare API |
| **Testing** | Jest with Coverage |

<br/>

---

<br/>

## 📦 Installation

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn
- Git
- [Copilot API](https://github.com/copilot-api) running locally

### Quick Start

\`\`\`bash
# Clone repository
git clone https://github.com/el-pablos/ai-whatsapp-chatbot.git

# Navigate to directory
cd ai-whatsapp-chatbot

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit configuration
nano .env

# Start bot
npm start
\`\`\`

### Using PM2 (Recommended)

\`\`\`bash
# Install PM2 globally
npm install -g pm2

# Start with ecosystem config
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save

# Enable startup script
pm2 startup
\`\`\`

<br/>

---

<br/>

## ⚙️ Configuration

Create \`.env\` file with the following variables:

\`\`\`env
# ═══════════════════════════════════════════
# 🤖 AI Configuration
# ═══════════════════════════════════════════
COPILOT_API_URL=http://localhost:4141
COPILOT_API_MODEL=claude-sonnet-4.5

# ═══════════════════════════════════════════
# 🌐 Health Check Server
# ═══════════════════════════════════════════
HEALTH_CHECK_PORT=8008
HEALTH_CHECK_DOMAIN=your-domain.com

# ═══════════════════════════════════════════
# ☁️ Cloudflare DNS (Optional)
# ═══════════════════════════════════════════
CF_ZONE_ID=your_zone_id
CF_ACCOUNT_ID=your_account_id
CF_DNS_API_TOKEN=your_api_token

# ═══════════════════════════════════════════
# 📁 Paths
# ═══════════════════════════════════════════
DB_PATH=./data/chat_memory.db
LOG_LEVEL=info
\`\`\`

<br/>

---

<br/>

## 📱 Usage

### First Time Setup

1. **Start the bot** - Run \`npm start\` or \`pm2 start\`
2. **Get pairing code** - Bot will display 8-digit code
3. **Link device** - WhatsApp > Linked Devices > Link with phone number
4. **Enter code** - Type the pairing code
5. **Done!** - Bot is now connected

### Commands

| Command | Description |
|---------|-------------|
| \`/help\` | Tampilkan bantuan |
| \`/clear\` | Hapus history chat |
| \`/stats\` | Lihat statistik bot |
| \`/kalender\` | Lihat kalender bulan ini |
| \`/libur\` | Cek libur nasional terdekat |
| \`/zodiak [tgl]\` | Cek zodiak (contoh: \`/zodiak 1 jan\`) |
| \`/ultah [tgl]\` | Cek info ultah (contoh: \`/ultah 1/1/2000\`) |
| \`/tebaksuku\` | Kirim foto, tebak suku (fun) |

### Natural Language Examples

\`\`\`
User: tanggal hari ini berapa?
Tama: 📅 Sabtu, 1 Februari 2026
      🕐 Jam 22:30 WIB
      📝 Weekend nih, santai dulu lah

User: kapan libur nasional?
Tama: 📅 Libur Nasional Terdekat:
      📌 Hari Raya Nyepi - 19 Maret 2026
      ⏰ Hari Raya Idul Fitri - 20 Maret 2026
      ...

User: zodiak aku 15 agustus
Tama: ♌ Zodiak kamu: Leo
      Elemen: Api
\`\`\`

<br/>

---

<br/>

## 🔌 API Endpoints

### Health Check Server (Port 8008)

| Endpoint | Method | Description |
|----------|--------|-------------|
| \`/\` | GET | Main health check + available endpoints |
| \`/health\` | GET | Simple health status |
| \`/status\` | GET | Detailed server status |
| \`/dashboard\` | GET | Full dashboard with stats & users |
| \`/users\` | GET | List all users with phone numbers |
| \`/stats\` | GET | Database statistics |
| \`/cleanup\` | POST | Trigger session cleanup |

### Example Response

\`\`\`json
GET /dashboard

{
  "status": "ok",
  "bot": {
    "name": "Tama AI Bot",
    "version": "2.1.0",
    "author": "Tama El Pablo",
    "contact": {
      "whatsapp": "082210819939",
      "instagram": "tam.aspx"
    }
  },
  "database": {
    "totalMessages": 1250,
    "activeMessages": 89,
    "totalUsers": 45,
    "activeChats": 12,
    "sessionExpiryHours": 24
  },
  "users": [
    {
      "phone": "628123456789",
      "name": "User Name",
      "messageCount": 50,
      "isActive": true
    }
  ]
}
\`\`\`

<br/>

---

<br/>

## 🧪 Testing

### Run Tests

\`\`\`bash
# Run all tests
npm test

# Run with verbose output
npm test -- --verbose

# Run specific test file
npm test -- tests/calendarHandler.test.js

# Run with coverage report
npm test -- --coverage
\`\`\`

### Test Coverage

\`\`\`
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   84.07 |    74.73 |      80 |   83.92 |
 aiHandler.js       |   75.51 |       60 |   71.42 |   76.08 |
 calendarHandler.js |   90.16 |    78.44 |     100 |   90.05 |
 dnsUpdater.js      |   96.38 |    72.97 |     100 |   96.34 |
 healthCheck.js     |   64.36 |       75 |    61.9 |   62.65 |
--------------------|---------|----------|---------|---------|
\`\`\`

<br/>

---

<br/>

## 📁 Project Structure

\`\`\`
ai-whatsapp-chatbot/
├── 📂 src/
│   ├── 🤖 bot.js              # Main bot service
│   ├── 🧠 aiHandler.js        # AI & persona logic
│   ├── 📅 calendarHandler.js  # Calendar features
│   ├── 💾 database.js         # SQLite operations
│   ├── 🌐 dnsUpdater.js       # Cloudflare DNS sync
│   ├── ❤️ healthCheck.js      # Express health server
│   ├── 📍 locationHandler.js  # Location features
│   └── 🖼️ mediaHandler.js     # Media processing
├── 📂 tests/
│   ├── aiHandler.test.js
│   ├── calendarHandler.test.js
│   ├── dnsUpdater.test.js
│   ├── healthCheck.test.js
│   └── setup.js
├── 📂 data/
│   └── chat_memory.db         # SQLite database
├── 📂 auth_info_baileys/      # WhatsApp session
├── ⚙️ ecosystem.config.js     # PM2 config
├── ⚙️ jest.config.js          # Jest config
├── 📋 package.json
└── 📖 README.md
\`\`\`

<br/>

---

<br/>

## 👨‍💻 Author

<p align="center">
  <img src="https://avatars.githubusercontent.com/el-pablos" alt="Tama El Pablo" width="100" style="border-radius: 50%"/>
</p>

<p align="center">
  <strong>Tama El Pablo</strong>
</p>

<p align="center">
  <a href="https://wa.me/6282210819939">
    <img src="https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp"/>
  </a>
  <a href="https://instagram.com/tam.aspx">
    <img src="https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white" alt="Instagram"/>
  </a>
  <a href="https://github.com/el-pablos">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/>
  </a>
</p>

<br/>

---

<br/>

## 📜 License

<p align="center">
  This project is licensed under the <strong>MIT License</strong>
</p>

<p align="center">
  Made with ❤️ and ☕ by <a href="https://github.com/el-pablos">Tama El Pablo</a>
</p>

<br/>

---

<p align="center">
  <sub>⭐ Star this repo if you find it useful!</sub>
</p>
