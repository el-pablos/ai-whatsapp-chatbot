/**
 * Feature Registry — complete inventory of every bot capability
 *
 * Each entry describes ONE user-facing feature including:
 *   - which source module implements it
 *   - what triggers it (regex, media type, AI decision, etc.)
 *   - input/output contract
 *   - example user messages
 *
 * Consumed by: toolRegistry, promptComposer (capability cards), README generator.
 *
 * @author  Tama El Pablo
 * @version 1.0.0
 */

const FEATURES = [
    // ═══════════════════════════════════════════════════
    //  AI / CHAT
    // ═══════════════════════════════════════════════════
    {
        id: 'ai_chat',
        name: 'AI Chat (Persona Tama)',
        module: 'aiHandler',
        description: 'Conversational AI with Tama persona via Copilot API. Handles general chat, questions, reasoning.',
        trigger: 'default — any text message that doesn\'t match another handler',
        input: { text: 'string', conversationHistory: 'Message[]' },
        output: { text: 'string' },
        examples: ['halo tama', 'jelasin soal quantum computing dong', 'gimana caranya belajar javascript?'],
    },
    {
        id: 'ai_vision',
        name: 'Image Analysis (Vision)',
        module: 'aiHandler',
        description: 'Analyze images using Vision API. Supports caption-guided analysis.',
        trigger: 'user sends image (with or without caption)',
        input: { imageBase64: 'string', mimetype: 'string', caption: 'string?' },
        output: { text: 'string' },
        examples: ['(kirim foto) ini apa ya?', '(kirim foto) analisa gambar ini'],
    },

    // ═══════════════════════════════════════════════════
    //  DOCUMENT PROCESSING
    // ═══════════════════════════════════════════════════
    {
        id: 'document_extract',
        name: 'Document Reader (70+ formats)',
        module: 'documentHandler',
        description: 'Extract text from documents: PDF, DOCX, PPTX, XLSX, HTML, TXT, MD, code files, ebooks, archives, and more.',
        trigger: 'user sends a supported document file',
        input: { buffer: 'Buffer', filename: 'string', mimetype: 'string' },
        output: { text: 'string', analysis: 'string', metadata: 'object' },
        examples: ['(kirim file PDF)', '(kirim file DOCX) rangkum ini dong'],
    },
    {
        id: 'document_summarize',
        name: 'Document Summarization',
        module: 'documentHandler',
        description: 'AI summarizes extracted document text. Works via caption or reply-to-document.',
        trigger: 'user sends document + caption like "rangkum" or replies to document',
        input: { extractedText: 'string', prompt: 'string' },
        output: { text: 'string' },
        examples: ['(kirim PDF) rangkum ini', '(reply ke dokumen) bikin outline dong'],
    },

    // ═══════════════════════════════════════════════════
    //  YOUTUBE
    // ═══════════════════════════════════════════════════
    {
        id: 'youtube_info',
        name: 'YouTube Video Info',
        module: 'youtubeHandler',
        description: 'Detect YouTube URL, fetch video info, AI analysis of content.',
        trigger: 'message contains YouTube URL',
        input: { url: 'string' },
        output: { info: 'object', analysis: 'string' },
        examples: ['https://youtube.com/watch?v=xxx', 'cek video ini dong https://youtu.be/xxx'],
    },
    {
        id: 'youtube_download_mp3',
        name: 'YouTube to MP3',
        module: 'youtubeHandler',
        description: 'Download YouTube video as MP3 audio file.',
        trigger: 'user replies "mp3" after YouTube info, or AI decides',
        input: { url: 'string', videoId: 'string' },
        output: { filePath: 'string', fileBuffer: 'Buffer' },
        examples: ['mp3'],
    },
    {
        id: 'youtube_download_mp4',
        name: 'YouTube to MP4',
        module: 'youtubeHandler',
        description: 'Download YouTube video as MP4 video file.',
        trigger: 'user replies "mp4" after YouTube info, or AI decides',
        input: { url: 'string', videoId: 'string' },
        output: { filePath: 'string', fileBuffer: 'Buffer' },
        examples: ['mp4'],
    },

    // ═══════════════════════════════════════════════════
    //  WEB SEARCH
    // ═══════════════════════════════════════════════════
    {
        id: 'web_search',
        name: 'Web Search (DuckDuckGo)',
        module: 'webSearchHandler',
        description: 'Search the internet via DuckDuckGo for real-time info. AI auto-triggers via [WEBSEARCH:] marker or user explicit request.',
        trigger: '/search, /cari, or AI [WEBSEARCH:query] marker',
        input: { query: 'string' },
        output: { results: 'object[]', formattedText: 'string' },
        examples: ['/search harga bitcoin', 'cari di internet soal AI terbaru', 'harga emas hari ini berapa?'],
    },

    // ═══════════════════════════════════════════════════
    //  WEATHER & EARTHQUAKE
    // ═══════════════════════════════════════════════════
    {
        id: 'weather_forecast',
        name: 'Weather Forecast (BMKG)',
        module: 'weatherHandler',
        description: 'Get weather forecast from BMKG for Indonesian cities.',
        trigger: 'natural language weather query or AI decision',
        input: { city: 'string' },
        output: { forecast: 'string' },
        examples: ['cuaca Jakarta gimana?', 'besok hujan ga ya di Bandung?'],
    },
    {
        id: 'weather_earthquake',
        name: 'Earthquake Info (BMKG)',
        module: 'weatherHandler',
        description: 'Get latest earthquake data from BMKG Indonesia.',
        trigger: 'natural language earthquake query',
        input: {},
        output: { earthquakeData: 'string' },
        examples: ['info gempa terbaru', 'ada gempa ga barusan?'],
    },

    // ═══════════════════════════════════════════════════
    //  LOCATION
    // ═══════════════════════════════════════════════════
    {
        id: 'location_search',
        name: 'Location Search (OpenStreetMap)',
        module: 'locationHandler',
        description: 'Search for places using Nominatim/OpenStreetMap and send location pin.',
        trigger: 'natural language location request (dimana, cari tempat, etc.)',
        input: { query: 'string' },
        output: { places: 'object[]', locationMessage: 'object' },
        examples: ['dimana Monas?', 'cari McDonalds terdekat', 'alamat UGM'],
    },
    {
        id: 'location_reverse',
        name: 'Reverse Geocoding',
        module: 'locationHandler',
        description: 'When user shares a location pin, identify the address.',
        trigger: 'user sends location message',
        input: { latitude: 'number', longitude: 'number' },
        output: { address: 'string' },
        examples: ['(kirim lokasi)'],
    },

    // ═══════════════════════════════════════════════════
    //  MEDIA & STICKER
    // ═══════════════════════════════════════════════════
    {
        id: 'media_analyze_image',
        name: 'Image Analysis',
        module: 'mediaHandler',
        description: 'Download and prepare image for Vision API analysis.',
        trigger: 'user sends image',
        input: { buffer: 'Buffer', mimetype: 'string' },
        output: { analysis: 'string' },
        examples: ['(kirim gambar)'],
    },
    {
        id: 'media_ethnicity',
        name: 'Ethnicity Guess (Fun)',
        module: 'mediaHandler',
        description: 'Fun feature: guess ethnicity from a face photo.',
        trigger: 'user sends photo with caption "tebak suku" or /tebaksuku',
        input: { buffer: 'Buffer', mimetype: 'string' },
        output: { text: 'string' },
        examples: ['/tebaksuku', '(kirim foto) tebak suku'],
    },
    {
        id: 'sticker_make',
        name: 'Sticker Maker',
        module: 'stickerHandler',
        description: 'Convert image/video to WhatsApp sticker (WebP format).',
        trigger: 'user sends image/video with caption containing "sticker"/"stiker"',
        input: { buffer: 'Buffer', mimetype: 'string', mediaType: '"image"|"video"' },
        output: { stickerBuffer: 'Buffer' },
        examples: ['(kirim gambar) sticker', '(kirim gambar) bikin stiker'],
    },

    // ═══════════════════════════════════════════════════
    //  VOICE
    // ═══════════════════════════════════════════════════
    {
        id: 'voice_transcribe',
        name: 'Voice Transcription (STT)',
        module: 'voiceHandler',
        description: 'Transcribe voice notes/audio to text using Whisper API, then process with AI.',
        trigger: 'user sends voice note or audio message',
        input: { audioBuffer: 'Buffer', format: 'string' },
        output: { transcription: 'string' },
        examples: ['(kirim voice note)'],
    },

    // ═══════════════════════════════════════════════════
    //  ENTERTAINMENT
    // ═══════════════════════════════════════════════════
    {
        id: 'mood_reading',
        name: 'Mood Reading',
        module: 'moodHandler',
        description: 'Analyze user mood/emotions from text and provide empathetic response.',
        trigger: '/bacamood, or natural mood-related text (curhat, "lagi ngerasa...")',
        input: { text: 'string', history: 'Message[]' },
        output: { analysis: 'object', response: 'string' },
        examples: ['/bacamood lagi sedih', 'curhat dong w lagi stress', 'w ngerasa berat banget'],
    },
    {
        id: 'tarot_reading',
        name: 'Tarot Card Reading',
        module: 'tarotHandler',
        description: 'Draw tarot cards and provide AI-interpreted reading. Supports multiple spreads.',
        trigger: '/tarot, /tarot1, /tarot3, /tarotlove, /tarotfull, or natural "tarot" keyword',
        input: { question: 'string', spreadType: 'string' },
        output: { reading: 'string', cards: 'object[]' },
        examples: ['/tarot1 apakah w bakal sukses?', '/tarot3', 'tarot cinta'],
    },
    {
        id: 'tarot_yesno',
        name: 'Tarot Yes/No',
        module: 'tarotHandler',
        description: 'Simple yes/no tarot answer for direct questions.',
        trigger: '/tarotyn [question]',
        input: { question: 'string' },
        output: { answer: 'string', card: 'object' },
        examples: ['/tarotyn apakah dia suka sama w?'],
    },

    // ═══════════════════════════════════════════════════
    //  CALENDAR
    // ═══════════════════════════════════════════════════
    {
        id: 'calendar_today',
        name: 'Today Info',
        module: 'calendarHandler',
        description: 'Get today\'s date, day name, holidays, and special events.',
        trigger: '/today, /hari ini, or calendar intent detection',
        input: {},
        output: { text: 'string' },
        examples: ['/today', 'hari ini tanggal berapa?'],
    },
    {
        id: 'calendar_holidays',
        name: 'National Holidays',
        module: 'calendarHandler',
        description: 'Show upcoming Indonesian national holidays.',
        trigger: '/libur, /holiday',
        input: {},
        output: { text: 'string' },
        examples: ['/libur', 'libur nasional kapan?'],
    },
    {
        id: 'calendar_zodiac',
        name: 'Zodiac Check',
        module: 'calendarHandler',
        description: 'Determine zodiac sign from birth date.',
        trigger: '/zodiak [date]',
        input: { month: 'number', day: 'number' },
        output: { text: 'string' },
        examples: ['/zodiak 1 januari', 'zodiak w apa ya 15 maret?'],
    },
    {
        id: 'calendar_birthday',
        name: 'Birthday Info',
        module: 'calendarHandler',
        description: 'Calculate age, day born, next birthday, from birth date.',
        trigger: '/ultah [full date]',
        input: { year: 'number', month: 'number', day: 'number' },
        output: { text: 'string' },
        examples: ['/ultah 1 januari 2000'],
    },
    {
        id: 'calendar_month',
        name: 'Month Calendar',
        module: 'calendarHandler',
        description: 'Display calendar grid for a given month.',
        trigger: '/kalender',
        input: { month: 'number?' },
        output: { text: 'string' },
        examples: ['/kalender', 'kalender bulan depan'],
    },

    // ═══════════════════════════════════════════════════
    //  FILE CREATION
    // ═══════════════════════════════════════════════════
    {
        id: 'file_create',
        name: 'File Creator',
        module: 'fileCreator',
        description: 'AI creates and sends files (.md, .txt, .csv, .json, .html, etc.) based on user request.',
        trigger: 'AI adds [FILE:filename.ext] marker in response',
        input: { content: 'string', fileName: 'string' },
        output: { fileBuffer: 'Buffer' },
        examples: ['buatkan laporan dalam format markdown', 'export data ke csv', 'bikin file html portofolio'],
    },

    // ═══════════════════════════════════════════════════
    //  PRESENTATION (PPTX)
    // ═══════════════════════════════════════════════════
    {
        id: 'presentation_create',
        name: 'PPTX Generator',
        module: 'pptxHandler',
        description: 'Generate and send PowerPoint (.pptx) presentations via Python backend (python-pptx). Supports title/bullets/summary slides with speaker notes.',
        trigger: 'user asks for pptx/ppt/powerpoint/presentasi/slide file, or AI tool_call presentation_create',
        input: { title: 'string', subtitle: 'string?', slides: 'SlideSpec[]', notes: 'NotesConfig?' },
        output: { filePath: 'string', fileName: 'string', type: 'pptx' },
        examples: ['bikinin pptx 5 slide soal machine learning', 'bikin presentasi perbandingan SVM vs Naive Bayes', 'kirimin ke aku dalam bentuk file .pptx aja'],
    },

    // ═══════════════════════════════════════════════════
    //  ADMIN / SYSTEM
    // ═══════════════════════════════════════════════════
    {
        id: 'admin_backup',
        name: 'Session Backup',
        module: 'backupHandler',
        description: 'Create and send ZIP backup of auth + database (owner only).',
        trigger: '/backup (owner only)',
        input: {},
        output: { zipBuffer: 'Buffer' },
        examples: ['/backup'],
    },
    {
        id: 'admin_stats',
        name: 'Bot Stats',
        module: 'database',
        description: 'Show bot statistics: total messages, users, chats.',
        trigger: '/stats',
        input: {},
        output: { stats: 'object' },
        examples: ['/stats'],
    },
    {
        id: 'admin_clear',
        name: 'Clear History',
        module: 'database',
        description: 'Clear conversation history for current user.',
        trigger: '/clear, /reset',
        input: {},
        output: { confirmation: 'string' },
        examples: ['/clear', '/reset'],
    },
    {
        id: 'system_dns',
        name: 'DNS Updater (Cloudflare)',
        module: 'dnsUpdater',
        description: 'Sync server IP to Cloudflare DNS record on startup.',
        trigger: 'automatic on boot (if CF env vars configured)',
        input: {},
        output: { action: 'string' },
        examples: [],
    },
    {
        id: 'system_healthcheck',
        name: 'Health Check Server',
        module: 'healthCheck',
        description: 'HTTP endpoints for monitoring: /, /health, /capabilities.',
        trigger: 'HTTP GET requests',
        input: {},
        output: { status: 'object' },
        examples: [],
    },
    {
        id: 'system_bug_report',
        name: 'Bug Reporter',
        module: 'bugReporter',
        description: 'Automatically report errors to owner via WhatsApp. Classifies dependency-missing vs real bugs.',
        trigger: 'automatic on error',
        input: { error: 'Error', context: 'string' },
        output: { report: 'string' },
        examples: [],
    },

    // ═══════════════════════════════════════════════════
    //  REMINDER & SCHEDULING
    // ═══════════════════════════════════════════════════
    {
        id: 'reminder_create',
        name: 'Reminder / Alarm',
        module: 'reminderHandler',
        description: 'Set reminders with natural language Indonesian time parsing. Cron checks every minute.',
        trigger: '"ingetin gw", "alarm jam 3", AI calls reminder_create tool',
        input: { message: 'string', time: 'string' },
        output: { confirmation: 'string', remindAt: 'Date' },
        examples: ['ingetin gw makan jam 12', 'alarm besok jam 7 pagi', 'reminder 30 menit lagi meeting'],
    },
    {
        id: 'reminder_list',
        name: 'List Reminders',
        module: 'reminderHandler',
        description: 'View all active reminders.',
        trigger: '/reminder list, AI calls reminder_list',
        input: {},
        output: { list: 'string' },
        examples: ['/reminder list', 'lihat pengingat gw'],
    },

    // ═══════════════════════════════════════════════════
    //  LONG-TERM MEMORY
    // ═══════════════════════════════════════════════════
    {
        id: 'memory_save',
        name: 'Long-Term Memory',
        module: 'memoryHandler',
        description: 'Persist user preferences, facts, and lessons across sessions. Auto-captures from chat context.',
        trigger: '"ingat ini", "gw suka X", "panggil aku Y", AI calls memory_save',
        input: { key: 'string', value: 'string', category: 'string' },
        output: { confirmation: 'string' },
        examples: ['ingat ini: gw alergi kacang', 'gw suka warna biru', 'panggil aku bos'],
    },
    {
        id: 'memory_search',
        name: 'Search Memory',
        module: 'memoryHandler',
        description: 'Search stored memories by keyword.',
        trigger: 'AI calls memory_search when context is needed',
        input: { query: 'string' },
        output: { memories: 'Array' },
        examples: ['apa yang gw suka?', 'emang gw alergi apa?'],
    },

    // ═══════════════════════════════════════════════════
    //  URL SUMMARIZER
    // ═══════════════════════════════════════════════════
    {
        id: 'url_summarize',
        name: 'URL / Article Summarizer',
        module: 'urlSummarizerHandler',
        description: 'Fetch a web page and summarize its content using AI.',
        trigger: 'user sends a URL, AI calls url_summarize',
        input: { url: 'string' },
        output: { summary: 'string' },
        examples: ['rangkumin artikel ini https://example.com', 'apa isi link ini?'],
    },

    // ═══════════════════════════════════════════════════
    //  NOTES & TODO
    // ═══════════════════════════════════════════════════
    {
        id: 'note_create',
        name: 'Notes',
        module: 'noteHandler',
        description: 'Create and manage personal text notes.',
        trigger: '/notes, AI calls note_create',
        input: { title: 'string', content: 'string' },
        output: { confirmation: 'string' },
        examples: ['catat ini: ide proyek baru', '/notes list'],
    },
    {
        id: 'todo_manage',
        name: 'Todo List',
        module: 'noteHandler',
        description: 'Create and manage to-do items with toggle done/active.',
        trigger: '/todo, AI calls todo_create/todo_toggle',
        input: { title: 'string' },
        output: { list: 'string' },
        examples: ['tambah todo: beli susu', '/todo list', '/todo done 1'],
    },

    // ═══════════════════════════════════════════════════
    //  TRANSLATE
    // ═══════════════════════════════════════════════════
    {
        id: 'translate',
        name: 'AI Translation (20 languages)',
        module: 'translateHandler',
        description: 'Translate text to 20 languages using AI. Supports id, en, ja, ko, zh, ar, es, fr, de, it, pt, ru, th, vi, ms, hi, tr, nl, pl, sv.',
        trigger: '/translate [lang] [text], AI calls translate_text',
        input: { text: 'string', targetLang: 'string' },
        output: { translation: 'string' },
        examples: ['/translate en halo apa kabar', '/translate ja selamat pagi'],
    },

    // ═══════════════════════════════════════════════════
    //  GIF SEARCH
    // ═══════════════════════════════════════════════════
    {
        id: 'gif_search',
        name: 'GIF Search (Tenor/Giphy)',
        module: 'gifHandler',
        description: 'Search GIFs from Tenor and Giphy. Requires TENOR_API_KEY or GIPHY_API_KEY.',
        trigger: '/gif [query], AI calls gif_search',
        input: { query: 'string' },
        output: { gifUrl: 'string' },
        examples: ['/gif kucing lucu', '/gif party'],
    },

    // ═══════════════════════════════════════════════════
    //  QR CODE
    // ═══════════════════════════════════════════════════
    {
        id: 'qr_generate',
        name: 'QR Code Generator',
        module: 'qrCodeHandler',
        description: 'Generate QR code image from text or URL.',
        trigger: '/qr [content], AI calls qr_generate',
        input: { content: 'string' },
        output: { imageBuffer: 'Buffer' },
        examples: ['/qr https://example.com', '/qr wifi:MyNetwork'],
    },

    // ═══════════════════════════════════════════════════
    //  PDF EDITOR
    // ═══════════════════════════════════════════════════
    {
        id: 'pdf_edit',
        name: 'PDF Editor (merge/extract/info)',
        module: 'pdfEditorHandler',
        description: 'Merge PDFs, extract specific pages, get PDF info. Uses pdf-lib.',
        trigger: '/pdf [action], AI calls pdf_info/pdf_extract_pages',
        input: { pdfBuffer: 'Buffer', pages: 'string' },
        output: { pdfBuffer: 'Buffer' },
        examples: ['/pdf info', '/pdf extract 1,3,5'],
    },

    // ═══════════════════════════════════════════════════
    //  POLLING
    // ═══════════════════════════════════════════════════
    {
        id: 'poll',
        name: 'Poll / Voting',
        module: 'pollHandler',
        description: 'Create polls with visual bar results in group or private chats.',
        trigger: '/poll [question] | [option1] | [option2], /vote [n], /poll close',
        input: { question: 'string', options: 'string[]' },
        output: { pollMessage: 'string' },
        examples: ['/poll Makan apa? | Nasi goreng | Mie | Sate', '/vote 1', '/poll close'],
    },

    // ═══════════════════════════════════════════════════
    //  CALCULATOR
    // ═══════════════════════════════════════════════════
    {
        id: 'calculator',
        name: 'Calculator & Converter',
        module: 'calculatorHandler',
        description: 'Math evaluation, unit conversion, and live currency conversion via mathjs + exchange rate API.',
        trigger: '/calc [expr], AI calls calculator_eval/convert_unit/convert_currency',
        input: { expression: 'string' },
        output: { result: 'string' },
        examples: ['/calc sqrt(144)', '/calc 100 USD to IDR', '/calc 10 km to mile'],
    },

    // ═══════════════════════════════════════════════════
    //  RSS FEEDS
    // ═══════════════════════════════════════════════════
    {
        id: 'rss_feeds',
        name: 'RSS Feed Reader',
        module: 'rssHandler',
        description: 'Subscribe to RSS feeds, check for new articles. Auto-checks every 30 minutes via cron.',
        trigger: '/rss add [url], /rss list, /rss check, /rss remove [id]',
        input: { url: 'string', label: 'string' },
        output: { articles: 'Array' },
        examples: ['/rss add https://example.com/feed.xml', '/rss list', '/rss check'],
    },

    // ═══════════════════════════════════════════════════
    //  IMAGE GENERATION
    // ═══════════════════════════════════════════════════
    {
        id: 'image_gen',
        name: 'AI Image Generation (DALL-E)',
        module: 'imageGenHandler',
        description: 'Generate images using OpenAI DALL-E. Requires OPENAI_API_KEY.',
        trigger: '/imagine [prompt], AI calls image_generate',
        input: { prompt: 'string', size: 'string' },
        output: { imageBuffer: 'Buffer' },
        examples: ['/imagine kucing bermain gitar', '/imagine sunset in tokyo --size landscape'],
    },

    // ═══════════════════════════════════════════════════
    //  SCHEDULED MESSAGES
    // ═══════════════════════════════════════════════════
    {
        id: 'scheduled_message',
        name: 'Scheduled Messages',
        module: 'scheduledMessageHandler',
        description: 'Schedule messages to be sent at specific times. Owner-only for other chats.',
        trigger: '/schedule [time] | [message], AI calls schedule_message',
        input: { message: 'string', time: 'string' },
        output: { confirmation: 'string' },
        examples: ['/schedule besok jam 10 | selamat pagi!', '/schedule list'],
    },

    // ── V5: Live Verification ──────────────────────────────────
    {
        id: 'live_verification',
        name: 'Live Internet Verification',
        module: 'liveVerifier',
        description: 'Auto-verify AI responses against live internet data. Checks prices, news, statistics, and factual claims in real-time.',
        trigger: 'Automatic when AI response contains factual claims, or /verify [query]',
        input: { query: 'string', ai_response: 'string' },
        output: { verified: 'string', confidence: 'number', updatedResponse: 'string', sources: 'array' },
        examples: ['harga bitcoin sekarang berapa?', '/verify siapa presiden Indonesia', 'berita terbaru gempa'],
    },
];

/**
 * Get all features
 */
const getAllFeatures = () => FEATURES;

/**
 * Get feature by ID
 */
const getFeatureById = (id) => FEATURES.find(f => f.id === id) || null;

/**
 * Get features by module name
 */
const getFeaturesByModule = (moduleName) => FEATURES.filter(f => f.module === moduleName);

/**
 * Get user-facing features only (exclude system/automatic)
 */
const getUserFacingFeatures = () => FEATURES.filter(f =>
    !f.id.startsWith('system.') && f.examples.length > 0
);

/**
 * Generate capability cards for AI prompt injection
 * Returns a compact string that AI can reason about
 */
const generateCapabilityCards = () => {
    return getUserFacingFeatures().map(f =>
        `[${f.id}] ${f.name}: ${f.description} | trigger: ${f.trigger} | examples: ${f.examples.slice(0, 2).join(', ')}`
    ).join('\n');
};

module.exports = {
    FEATURES,
    getAllFeatures,
    getFeatureById,
    getFeaturesByModule,
    getUserFacingFeatures,
    generateCapabilityCards,
};
