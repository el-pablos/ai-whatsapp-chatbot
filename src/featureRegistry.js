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
