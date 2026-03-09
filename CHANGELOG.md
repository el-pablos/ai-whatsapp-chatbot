# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.1.0] - 2025-07-08

### 🛡️ Dashboard Admin + Allowlist + Feature Toggle + Docker

Full admin dashboard web UI, phone allowlist system, per-feature toggle,
and Docker deployment support. Major security hardening for health check endpoints.

### Added
- **Dashboard Admin Web** (`src/dashboard/server.js`): Express server on port 6666 with 20+ API routes — auth (login/logout/me/change-password), allowlist CRUD, config management, feature toggles, chat monitor, analytics, system logs, user management
- **Dashboard Frontend** (`src/dashboard/frontend/`): React 19 + Vite 7 + Tailwind CSS 4 SPA with 10 pages — Login, Overview, Allowlist, BotConfig, Features, ChatMonitor, ChatDetail, Analytics, Logs, Settings. Dark mode, Outfit font, brand #465FFF
- **Allowlist Manager** (`src/allowlistManager.js`): Central allowlist control — owner always allowed, empty list = all allowed, cached phone check
- **6 new database tables**: allowlist, bot_config, feature_toggles, admin_users, admin_sessions, activity_logs (30+ CRUD functions, 2 in-memory caches)
- **4 new AI tools**: allowlist.add, allowlist.remove, allowlist.toggle, allowlist.list (64 tools total)
- **7 WhatsApp commands**: !izinkan, !hapusizin, !toggleizin, !daftarizin, !fitur, !matikanfitur, !hidupkanfitur
- **Feature Toggle system**: CMD_FEATURE_MAP in intentRouter.js, toggle check before command dispatch, toggle guard in tool execution
- **Docker setup**: Dockerfile (multi-stage), docker-compose.yml (production), docker-compose.dev.yml (development), .dockerignore
- **29 new tests** (allowlistManager: 12, dashboardServer: 17) — total 1280 tests, 41 suites

### Changed
- **bot.js**: Allowlist filter in message processing, dashboard server startup/shutdown integration
- **intentRouter.js**: Feature toggle checks before FAST_COMMANDS and PREFIX_COMMANDS dispatch
- **toolRegistry.js**: Owner guard + feature toggle guard in executeTool
- **healthCheck.js**: Secured /dashboard (redirect), /users, /stats, /cleanup (403 forbidden)
- **database.js**: Owner check consolidated — delegates to userProfileHelper.js

### Security
- Admin sessions with bcrypt password hashing + httpOnly cookies
- Health check endpoints locked down (only /health, /status, /capabilities public)
- Phone masking in user management API

## [3.1.0] - 2025-07-31

### 🎨 PPTX Generation — PowerPoint via AI

Bot can now generate and send real `.pptx` (PowerPoint) files via WhatsApp.
Uses a Python backend (`python-pptx`) called from Node.js through a reusable
Python runner utility. Fully integrated into the AI-First tool-calling pipeline.

### Added
- **PPTX Generator** (`tools/pptx_generator.py`): Python script that builds .pptx files from JSON slide specs — supports title/bullets/summary slide types, speaker notes, 16:9 aspect ratio, styled colors
- **Python Runner** (`src/pythonRunner.js`): Reusable Node.js utility to call Python scripts via `execFile` — auto-detects `python3`/`python`, timeout support, JSON result parsing
- **PPTX Handler** (`src/pptxHandler.js`): Full pipeline — validateSlideSpec → generatePptx → sendPptx → cleanupFiles
- **`presentation.create` tool** in Tool Registry (26 tools total)
- **`presentation.create` feature** in Feature Registry
- **`tools/requirements.txt`**: Python dependencies (`python-pptx>=1.0.0`)
- **82 new tests** across 3 files (984 total, 26 suites):
  - `tests/pythonRunner.test.js` (19 tests)
  - `tests/pptxHandler.test.js` (60 tests)
  - `tests/intentRouter.test.js` (+1 PPTX routing test)
  - `tests/toolRegistry.test.js` (+2 presentation tests)

### Changed
- **aiOrchestrator.js**: Detects `type: 'pptx'` tool results, attaches `response.pptx`
- **intentRouter.js**: Post-processes `response.pptx` — calls `sendPptx` with formatted caption
- **fileCreator.js**: Added PPTX/PPT/DOCX/XLSX MIME types + PPTX detection patterns for delegation
- **README.md**: Updated features, prerequisites (Python 3), architecture diagram, file tree, test count

## [3.0.0] - 2025-07-24

### 🏗️ Architecture — AI-First Orchestrator

Complete architectural overhaul: every feature is now an AI-callable tool.
The Copilot API dynamically selects and chains tools via OpenAI-compatible
function-calling. No more static if-else routing.

### Added
- **Feature Registry** (`src/featureRegistry.js`): 30+ feature entries with metadata, examples, module mappings
- **Tool Registry** (`src/toolRegistry.js`): 25 AI-callable tools with JSON schema + `execute(params, ctx)`
- **Message Normalizer** (`src/messageNormalizer.js`): Standardizes Baileys proto messages into uniform shape
- **Prompt Composer** (`src/promptComposer.js`): Builds context-rich prompts with persona, tools, user profile
- **AI Orchestrator** (`src/aiOrchestrator.js`): Tool-calling loop (max 3 iterations), retry, legacy marker fallback
- **Intent Router** (`src/intentRouter.js`): Fast-path commands + AI orchestrator default path
- **206 new tests** across 6 test files for all new modules (902 total, 24 suites)

### Changed
- **bot.js**: Refactored from 2464 → 617 lines (75% reduction); all routing delegated to Intent Router
- **processMessage()**: Reduced from ~800 lines to ~40 lines: dedup → normalize → route
- All old `handle*` functions removed (handleQuotedMediaReply, handleSpecialCommands, handleVoiceMessage, handleMediaMessage, handleLocationRequest, handleUserLocation, handleTarotRequest, handleYesNoTarot, handleMoodRequest, handleYoutubeUrl, handleYoutubeDownload)
- Banner updated to v3.0.0

### Removed
- `_extractRawTextFromBuffer` helper (dead code)
- `pendingYoutubeDownloads` Map (dead code)
- `createThinkingIndicator` function (dead code)
- `.claude/` directory from git tracking

## [2.6.0] - 2026-02-24

### Added
- **Startup Capability Report**: yt-dlp + ffmpeg preflight check at connection time
- **Cross-platform `commandExists()`**: Uses `where` on Windows, `which` on Unix
- **`isFFmpegInstalled()`**: New check for ffmpeg availability (required for MP3/MP4)
- **`checkDependencies()`**: Single call returns `{ ytDlp, ffmpeg, ready }` report
- **WebSearch retry with exponential backoff**: `axiosGetWithRetry()` with configurable retries
- **Configurable search timeout**: `WEBSEARCH_TIMEOUT_MS` and `WEBSEARCH_MAX_RETRIES` env vars
- **`normalizeError()` + `safeErrorMessage()`**: New `src/errorUtils.js` module
- **Smoke / Doctor test**: `npm run doctor` and `tests/smoke.test.js` (21 module-loading checks)
- **`tests/errorUtils.test.js`**: 13 tests for error normalization

### Fixed
- **yt-dlp "not found" crash**: `processYoutubeUrl`, `downloadAsMP3`, `downloadAsMP4` now have preflight guards
- **`isYtDlpInstalled()` Windows broken**: Was using `which` (Unix-only), now cross-platform
- **ffmpeg never checked**: MP3 conversion and MP4 muxing silently fail without ffmpeg — now guarded
- **Baileys prekey bundle log noise**: Separated Baileys logger (`error` level) from app logger (`info`)
- **WebSearch hardcoded timeout**: Extracted to `SEARCH_TIMEOUT` constant, configurable via env
- **healthCheck.js hardcoded version**: Now reads from `package.json`
- **healthCheck test hardcoded version**: Now reads from `package.json`

### Changed
- Version bumped to 2.6.0
- README: Updated badges, prerequisites (Node >=20), test count (567), directory structure, new env vars, version history
- 567 tests passing across 16 test suites

## [2.5.1] - 2026-02-24

### Fixed
- File creation `FILE_MARKER_REGEX` had `^` anchor preventing detection when AI puts intro text before `[FILE:]` marker
- Web search timeouts 10s → 25s for all 3 backends (DDG instant, DDG HTML, Google scrape)
- ACK_PATTERNS `bet` matching `better` — added `\b` word boundary

## [2.5.0] - 2026-02-24

### Added
- Real-time AI web search via `[WEBSEARCH:query]` marker
- DuckDuckGo HTML search backend (comprehensive results)
- File Creator module (`[FILE:name.ext]` marker) 
- Bug Reporter module (auto-report errors to owner)
- Reply-to-attachment fallback (analyze quoted media)

## [2.3.0] - 2026-02-02

### Added
- **Universal Document Reader**: Support for 70+ document formats
  - Office: DOC, DOCX, ODT, RTF, WPD, WPS, etc.
  - eBooks: EPUB, MOBI, AZW, FB2, DJVU, etc.
  - Presentations: PPT, PPTX, ODP, KEY, etc.
  - Archives: ZIP, RAR, 7Z, TAR, GZ, etc.
  - No size limits, no text length limits
- Improved auth persistence validation
- Auto-cleanup for corrupt/incomplete auth files
- Better connection logging
- SECURITY.md for security guidelines
- CHANGELOG.md for version tracking

### Fixed
- Document handler model name (was hardcoded, now uses env var)
- YouTube handler model name (was hardcoded, now uses env var)
- **API URL consistency**: Fixed 404 errors in documentHandler and youtubeHandler
  - Now correctly appends `/v1/chat/completions` to COPILOT_API_URL
- Auth folder now uses absolute path for reliability
- Credentials validation checks `registered` and complete `me.id`

### Changed
- Package version updated to 2.3.0
- README completely rewritten with detailed documentation
- temp_docs/ added to .gitignore

## [2.2.0] - 2026-02-01

### Added
- **YouTube Downloader**: Download videos as MP3 or MP4
  - URL detection in messages
  - Video info extraction with AI analysis
  - Interactive format selection (buttons)
  - Progress tracking
- **PDF/DOCX Reader**: Read and analyze documents
  - AI-powered document analysis
  - Automatic text extraction
- Message chunking for long responses (>4000 chars)

### Changed
- Improved message sending with `smartSend` utility
- Better error handling for media downloads

## [2.1.0] - 2026-01-31

### Added
- **Mood Reader**: AI analyzes your mood from messages
- **Tarot Reading**: Complete 78-card tarot system
  - Major Arcana (22 cards)
  - Minor Arcana (56 cards)
  - Multiple spread types (single, three-card, celtic cross, etc.)
  - Yes/No readings
- Calendar intent priority fix (mood doesn't override date queries)

### Fixed
- Mood handler no longer triggers on calendar/date queries
- Better intent detection priority

## [2.0.0] - 2026-01-30

### Added
- **Unlimited Memory**: SQLite-based chat history (no more 10 message limit)
- **Vision API Integration**: Image understanding and analysis
- **Location Sharing**: OpenStreetMap integration
- **Calendar Features**: Date, holiday, and zodiac info
- **Health Check Server**: Monitoring endpoints
- **Cloudflare DNS Automation**: Dynamic DNS updates
- **Ethnicity Detection**: Fun feature for photos
- PM2 process management support
- Comprehensive test suite (100+ tests)

### Changed
- Complete rewrite of message handling
- Improved Tama persona consistency
- Better error handling throughout

### Security
- Dashboard endpoints require protection
- Sensitive data handling guidelines

## [1.0.0] - 2026-01-15

### Added
- Initial release
- Basic WhatsApp bot functionality
- AI chat integration via Copilot API
- Tama persona (casual Indonesian style)
- Auto-reconnect handling
- QR code and pairing code authentication
