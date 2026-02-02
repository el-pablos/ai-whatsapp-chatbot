# 🤖 Tama AI WhatsApp Bot

> AI-powered WhatsApp chatbot with Indonesian persona - natural, casual, and feature-rich

[![Version](https://img.shields.io/badge/version-2.3.0-blue.svg?style=for-the-badge)](CHANGELOG.md)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![Tests](https://img.shields.io/badge/tests-274%20passing-success.svg?style=for-the-badge)](tests/)
[![License](https://img.shields.io/badge/license-MIT-purple.svg?style=for-the-badge)](LICENSE)

---

## ✨ TL;DR

- 🎭 **Persona**: Natural Indonesian (gaul Jakarta) AI chat
- 🧠 **Memory**: Unlimited SQLite chat history
- 📄 **Documents**: Read 70+ formats (PDF, DOCX, EPUB, ZIP, etc.)
- 🎬 **YouTube**: Download as MP3/MP4
- 👁️ **Vision**: Image understanding & analysis
- 📍 **Location**: Search & share places (OpenStreetMap)
- 📅 **Calendar**: Dates, holidays, zodiac
- 🔮 **Tarot**: Full 78-card reading system

---

## 🚀 Quick Start

```bash
# Clone & install
git clone https://github.com/el-pablos/ai-whatsapp-chatbot.git
cd ai-whatsapp-chatbot
npm install

# Configure
cp .env.example .env
# Edit .env with your settings

# Start
npm start
```

**First run:** Enter the pairing code shown in terminal into WhatsApp > Linked Devices > Link with phone number

---

## 📋 Features

### 💬 AI Chat
| Feature | Description |
|---------|-------------|
| Tama Persona | Casual Indonesian style, emoji-rich |
| Context Memory | Remembers conversations (SQLite) |
| Reply Detection | Understands quoted messages |

### 📄 Universal Document Reader
Supports **70+ formats** with NO size limits:

| Category | Formats |
|----------|---------|
| Office | DOC, DOCX, ODT, RTF, PPT, PPTX, XLS, XLSX |
| eBooks | EPUB, MOBI, AZW, FB2, DJVU |
| Archives | ZIP, RAR, 7Z, TAR, GZ |
| Text | TXT, MD, HTML, JSON, XML |

### 🎬 YouTube Download
- Auto-detect YouTube links
- Download as MP3 (audio) or MP4 (video)
- AI video info analysis

### 📍 Location
- Search places: `cariin kafe di Bandung`
- Share location pins via OpenStreetMap

### 📅 Calendar
- Today's info: `hari ini tanggal berapa`
- Holiday check: `besok libur ga`
- Zodiac: `zodiak 15 april`

### 🔮 Tarot
- 78 cards (Major + Minor Arcana)
- Multiple spreads: single, 3-card, celtic cross
- Yes/No readings

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `COPILOT_API_URL` | ✅ | `localhost:4141` | AI API endpoint |
| `COPILOT_API_MODEL` | | `claude-sonnet-4.5` | Model name |
| `WA_AUTH_METHOD` | | `pairing` | `qr` or `pairing` |
| `WA_PHONE_NUMBER` | For pairing | | Your WA number |
| `HEALTH_CHECK_PORT` | | `8008` | Health server port |

See [.env.example](.env.example) for full list.

---

## 🔒 Security Notes

> ⚠️ **IMPORTANT**: Read [SECURITY.md](SECURITY.md) before deploying!

### Never Commit These:
```
auth_info_baileys/    # Session credentials
data/chat_memory.db   # User data
.env                  # Secrets
```

### Dashboard Protection
The `/dashboard` and `/users` endpoints expose user data. In production:
- Keep bound to `localhost` (default)
- Use authenticated reverse proxy
- Implement IP allowlist

---

## 📡 API Endpoints

Default: `http://localhost:8008`

| Endpoint | Method | Description | Auth Needed |
|----------|--------|-------------|-------------|
| `/health` | GET | Basic health check | No |
| `/stats` | GET | Bot statistics | Yes |
| `/dashboard` | GET | User data | **Yes** |
| `/cleanup` | POST | Memory cleanup | **Yes** |

---

## 🧪 Testing

```bash
# Run all tests
npm test

# With coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Pairing code expired | Restart bot, get new code |
| Auth keeps resetting | Delete `auth_info_baileys/`, re-pair |
| Document read error | Check if format is supported |
| 404 on AI calls | Verify `COPILOT_API_URL` and model name |

---

## 📝 Commands

| Command | Description |
|---------|-------------|
| `/help` | Show help |
| `/clear` | Clear chat memory |
| `/stats` | Show your stats |

**Natural language examples:**
- `cariin resto di Jakarta`
- `hari ini libur ga`
- `tarot aku dong`
- `download https://youtube.com/...`

---

## 🏗️ Architecture

```
WhatsApp Message
      ↓
  bot.js (router)
      ↓
  [handler].js
      ↓
  Copilot API (AI)
      ↓
  database.js (SQLite)
      ↓
  Response → WhatsApp
```

---

## 📚 Documentation

- [CHANGELOG.md](CHANGELOG.md) - Version history
- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute
- [SECURITY.md](SECURITY.md) - Security guidelines
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) - Community standards

---

## ⚠️ Disclaimer

This bot uses the unofficial WhatsApp Web API (Baileys). WhatsApp may ban accounts using unofficial APIs. Use at your own risk for personal/educational purposes only.

---

## 📄 License

MIT © [Tama El Pablo](https://github.com/el-pablos)

---

<p align="center">
  Made with ☕ and lots of <code>wkwkwk</code>
</p>
