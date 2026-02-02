# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
