/**
 * Tool Registry — every bot capability as an AI-callable tool
 *
 * Each tool has:
 *   - name (underscore-separated namespace, e.g. web_search)
 *   - description (AI reads this to decide when to call)
 *   - parameters (JSON schema for structured input)
 *   - execute(params, ctx) — deterministic function that does the work
 *
 * The AI Orchestrator passes this registry to the Copilot API as
 * "tools" and executes whichever tool(s) the AI selects.
 *
 * @author  Tama El Pablo
 * @version 1.0.0
 */

const {
    processDocument, isSupportedDocument, getDocumentInfo, getSupportedFormats,
    extractText,
} = require('./documentHandler');
const {
    detectYoutubeUrl, processYoutubeUrl,
    downloadAsMP3, downloadAsMP4, cleanupFile, checkDependencies,
} = require('./youtubeHandler');
const {
    webSearch, formatSearchResult,
} = require('./webSearchHandler');
const {
    getWeather, getLatestEarthquake, getRecentEarthquakes,
    processWeatherRequest, detectWeatherQuery,
} = require('./weatherHandler');
const {
    searchPlace, reverseGeocode, formatLocationText,
} = require('./locationHandler');
const {
    analyzeMood, generateMoodResponse,
} = require('./moodHandler');
const {
    performReading, yesNoReading,
} = require('./tarotHandler');
const {
    transcribeAudio,
} = require('./voiceHandler');
const {
    imageToSticker, videoToSticker,
} = require('./stickerHandler');
const {
    parseFileMarker, createAndSendFile, getMimeType,
} = require('./fileCreator');
const {
    createPptxFromSpec, validateSlideSpec, detectPptxRequest,
} = require('./pptxHandler');
const {
    detectCalendarIntent, formatCalendarResponse,
    parseDateFromString, getTodayInfo,
} = require('./calendarHandler');
const {
    getStats, clearConversation,
} = require('./database');
const {
    runBackupNow,
} = require('./backupHandler');
const {
    syncDNSRecord,
} = require('./dnsUpdater');
const {
    createReminder, listReminders, deleteReminder,
} = require('./reminderHandler');
const {
    saveMemory, searchMemory, listMemories, deleteMemory,
} = require('./memoryHandler');
const {
    summarizeUrl,
} = require('./urlSummarizerHandler');
const {
    createNote, createTodo, listNotes, listTodos, toggleTodo, searchNotes, deleteNote,
} = require('./noteHandler');
const {
    translateText,
} = require('./translateHandler');
const {
    searchGif,
} = require('./gifHandler');
const {
    generateQRCode,
} = require('./qrCodeHandler');
const {
    mergePDFs, extractPages, getPDFInfo,
} = require('./pdfEditorHandler');
const {
    createPoll, votePoll, closePoll, showPollResults,
} = require('./pollHandler');
const {
    calculateExpression, convertUnit, convertCurrency,
} = require('./calculatorHandler');
const {
    subscribeFeed, listFeeds, unsubscribeFeed, checkUserFeeds,
} = require('./rssHandler');
const {
    generateImage, downloadImageBuffer, isImageGenAvailable,
} = require('./imageGenHandler');
const {
    scheduleMessage, listScheduledMessages,
} = require('./scheduledMessageHandler');

// ═══════════════════════════════════════════════════════════
//  TOOL DEFINITIONS
// ═══════════════════════════════════════════════════════════

const TOOLS = [
    // ── Document ─────────────────────────────────────────
    {
        name: 'document_extract_text',
        description: 'Extract and analyze text from a document file (PDF, DOCX, PPTX, XLSX, TXT, HTML, ebook, archive, and 70+ more formats). Use when user sends a document or asks about a document.',
        parameters: {
            type: 'object',
            properties: {
                prompt: { type: 'string', description: 'User prompt or question about the document (optional)' },
            },
            required: [],
        },
        requiresMedia: 'document',
        execute: async (params, ctx) => {
            if (!ctx.mediaBuffer) return { success: false, error: 'No document buffer provided' };
            const result = await processDocument(
                ctx.mediaBuffer, ctx.mediaFilename || 'unknown',
                ctx.mediaMimetype || 'application/octet-stream',
                params.prompt || '', ctx.conversationHistory || [], ctx.onProgress
            );
            return result;
        },
    },
    {
        name: 'document_get_info',
        description: 'Get metadata/info about a document without full extraction.',
        parameters: {
            type: 'object',
            properties: {
                filename: { type: 'string', description: 'Filename of the document' },
            },
            required: ['filename'],
        },
        execute: async (params) => {
            const info = getDocumentInfo(params.filename);
            return { success: true, info };
        },
    },
    {
        name: 'document_supported_formats',
        description: 'List all supported document formats the bot can read.',
        parameters: { type: 'object', properties: {}, required: [] },
        execute: async () => ({ success: true, formats: getSupportedFormats() }),
    },

    // ── YouTube ──────────────────────────────────────────
    {
        name: 'youtube_get_info',
        description: 'Get video info and AI analysis for a YouTube URL. Use when user sends a YouTube link.',
        parameters: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'YouTube URL' },
            },
            required: ['url'],
        },
        execute: async (params) => {
            const result = await processYoutubeUrl(params.url);
            return result;
        },
    },
    {
        name: 'youtube_download_mp3',
        description: 'Download a YouTube video as MP3 audio file. Use when user asks for audio download.',
        parameters: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'YouTube URL' },
                videoId: { type: 'string', description: 'YouTube video ID' },
            },
            required: ['url', 'videoId'],
        },
        execute: async (params) => {
            const result = await downloadAsMP3(params.url, params.videoId);
            return result;
        },
    },
    {
        name: 'youtube_download_mp4',
        description: 'Download a YouTube video as MP4 video file. Use when user asks for video download.',
        parameters: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'YouTube URL' },
                videoId: { type: 'string', description: 'YouTube video ID' },
            },
            required: ['url', 'videoId'],
        },
        execute: async (params) => {
            const result = await downloadAsMP4(params.url, params.videoId);
            return result;
        },
    },

    // ── Web Search ───────────────────────────────────────
    {
        name: 'web_search',
        description: 'Search the internet via DuckDuckGo for real-time or current information. Use when user asks about current events, prices, news, or anything you are not sure about.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query (English preferred for best results)' },
            },
            required: ['query'],
        },
        execute: async (params) => {
            const result = await webSearch(params.query);
            if (result && result.success && result.hasContent) {
                const formatted = formatSearchResult(result);
                return { success: true, results: formatted, raw: result };
            }
            return { success: false, error: 'No search results found' };
        },
    },

    // ── Weather ──────────────────────────────────────────
    {
        name: 'weather_forecast',
        description: 'Get weather forecast from BMKG for an Indonesian city. Use when user asks about weather.',
        parameters: {
            type: 'object',
            properties: {
                city: { type: 'string', description: 'Indonesian city name (e.g., Jakarta, Bandung, Surabaya)' },
            },
            required: ['city'],
        },
        execute: async (params) => {
            const result = await processWeatherRequest({ type: 'weather', city: params.city });
            return { success: !!result, data: result };
        },
    },
    {
        name: 'weather_earthquake',
        description: 'Get latest earthquake information from BMKG Indonesia. Use when user asks about earthquakes or gempa.',
        parameters: { type: 'object', properties: {}, required: [] },
        execute: async () => {
            const result = await processWeatherRequest({ type: 'earthquake' });
            return { success: !!result, data: result };
        },
    },

    // ── Location ─────────────────────────────────────────
    {
        name: 'location_search',
        description: 'Search for a place/location on OpenStreetMap. Returns coordinates and address. Use when user asks "dimana", "cari tempat", locations.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Place name or address to search' },
            },
            required: ['query'],
        },
        execute: async (params) => {
            const places = await searchPlace(params.query, { limit: 3 });
            if (places.length === 0) return { success: false, error: `Tidak menemukan "${params.query}"` };
            return {
                success: true,
                places: places.map(p => ({
                    name: p.name, address: p.display_name,
                    lat: p.lat, lon: p.lon,
                    text: formatLocationText(p),
                })),
            };
        },
    },
    {
        name: 'location_reverse',
        description: 'Get address from coordinates (reverse geocoding). Use when user shares a location pin.',
        parameters: {
            type: 'object',
            properties: {
                latitude: { type: 'number', description: 'Latitude' },
                longitude: { type: 'number', description: 'Longitude' },
            },
            required: ['latitude', 'longitude'],
        },
        execute: async (params) => {
            const result = await reverseGeocode(params.latitude, params.longitude);
            return { success: true, address: result };
        },
    },

    // ── Sticker ──────────────────────────────────────────
    {
        name: 'sticker_make',
        description: 'Convert an image or short video into a WhatsApp sticker. Use when user says "sticker", "stiker", "bikin stiker".',
        parameters: {
            type: 'object',
            properties: {
                mediaType: { type: 'string', enum: ['image', 'video'], description: 'Type of media to convert' },
            },
            required: ['mediaType'],
        },
        requiresMedia: 'image_or_video',
        execute: async (params, ctx) => {
            if (!ctx.mediaBuffer) return { success: false, error: 'No media buffer' };
            const fn = params.mediaType === 'video' ? videoToSticker : imageToSticker;
            const stickerBuf = await fn(ctx.mediaBuffer, ctx.mediaMimetype);
            return { success: true, stickerBuffer: stickerBuf, type: 'sticker' };
        },
    },

    // ── Voice ────────────────────────────────────────────
    {
        name: 'voice_transcribe',
        description: 'Transcribe a voice note or audio message to text (Speech-to-Text). Use when user sends voice note.',
        parameters: {
            type: 'object',
            properties: {
                format: { type: 'string', description: 'Audio format (ogg, mp3, wav)', default: 'ogg' },
            },
            required: [],
        },
        requiresMedia: 'audio',
        execute: async (params, ctx) => {
            if (!ctx.mediaBuffer) return { success: false, error: 'No audio buffer' };
            const result = await transcribeAudio(ctx.mediaBuffer, params.format || 'ogg');
            return result;
        },
    },

    // ── Mood ─────────────────────────────────────────────
    {
        name: 'mood_reading',
        description: 'Analyze user\'s mood/emotions from their text and provide empathetic response. Use when user is curhat, venting, or expressing feelings.',
        parameters: {
            type: 'object',
            properties: {
                text: { type: 'string', description: 'User text describing their feelings' },
            },
            required: ['text'],
        },
        execute: async (params, ctx) => {
            const analysis = await analyzeMood(params.text, ctx.conversationHistory || []);
            const response = generateMoodResponse(analysis);
            return { success: true, analysis, response };
        },
    },

    // ── Tarot ────────────────────────────────────────────
    {
        name: 'tarot_reading',
        description: 'Perform a tarot card reading with AI interpretation. Supports spreads: single, threeCard, loveSpread, celticCross.',
        parameters: {
            type: 'object',
            properties: {
                question: { type: 'string', description: 'User question for tarot reading' },
                spread: { type: 'string', enum: ['single', 'threeCard', 'loveSpread', 'celticCross'], description: 'Type of spread' },
            },
            required: ['question'],
        },
        execute: async (params, ctx) => {
            const result = await performReading(
                params.spread || 'threeCard',
                params.question,
                ctx.conversationHistory || []
            );
            return { success: true, reading: result.reading, cards: result.cards };
        },
    },
    {
        name: 'tarot_yesno',
        description: 'Quick tarot yes/no answer for a direct question.',
        parameters: {
            type: 'object',
            properties: {
                question: { type: 'string', description: 'Yes/no question' },
            },
            required: ['question'],
        },
        execute: async (params) => {
            const result = yesNoReading(params.question);
            return { success: true, text: result.text };
        },
    },

    // ── Calendar ─────────────────────────────────────────
    {
        name: 'calendar_today',
        description: 'Get today\'s date, day name, holiday info.',
        parameters: { type: 'object', properties: {}, required: [] },
        execute: async () => {
            const data = formatCalendarResponse('today');
            return { success: true, text: data };
        },
    },
    {
        name: 'calendar_holidays',
        description: 'List upcoming Indonesian national holidays.',
        parameters: { type: 'object', properties: {}, required: [] },
        execute: async () => {
            const data = formatCalendarResponse('holidays');
            return { success: true, text: data };
        },
    },
    {
        name: 'calendar_zodiac',
        description: 'Get zodiac sign from birth date.',
        parameters: {
            type: 'object',
            properties: {
                month: { type: 'number', description: 'Birth month (1-12)' },
                day: { type: 'number', description: 'Birth day (1-31)' },
            },
            required: ['month', 'day'],
        },
        execute: async (params) => {
            const data = formatCalendarResponse('zodiac', { month: params.month, day: params.day });
            return { success: true, text: data };
        },
    },
    {
        name: 'calendar_birthday',
        description: 'Calculate age, day born, and next birthday from full birth date.',
        parameters: {
            type: 'object',
            properties: {
                year: { type: 'number', description: 'Birth year' },
                month: { type: 'number', description: 'Birth month (1-12)' },
                day: { type: 'number', description: 'Birth day (1-31)' },
            },
            required: ['year', 'month', 'day'],
        },
        execute: async (params) => {
            const data = formatCalendarResponse('birthday', params);
            return { success: true, text: data };
        },
    },
    {
        name: 'calendar_month',
        description: 'Show calendar grid for a month.',
        parameters: {
            type: 'object',
            properties: {
                month: { type: 'number', description: 'Month number 1-12 (default: current)' },
            },
            required: [],
        },
        execute: async (params) => {
            const data = formatCalendarResponse('calendar', params.month ? { month: params.month } : undefined);
            return { success: true, text: data };
        },
    },

    // ── File Creator ─────────────────────────────────────
    {
        name: 'file_create',
        description: 'Create a file with given content and filename. Use when user asks to create/export a document, report, or code file.',
        parameters: {
            type: 'object',
            properties: {
                fileName: { type: 'string', description: 'Filename with extension (e.g., report.md, data.csv)' },
                content: { type: 'string', description: 'Full file content' },
            },
            required: ['fileName', 'content'],
        },
        execute: async (params) => {
            return {
                success: true,
                fileName: params.fileName,
                content: params.content,
                mimetype: getMimeType(params.fileName),
                type: 'file',
            };
        },
    },

    // ── Presentation (PPTX) ───────────────────────────────
    {
        name: 'presentation_create',
        description: 'Generate a PowerPoint (.pptx) presentation file with slides. Use when user asks for pptx, ppt, powerpoint, presentasi, or slides. Provide a valid slide spec JSON with title, subtitle, and slides array.',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Presentation title' },
                subtitle: { type: 'string', description: 'Optional subtitle' },
                slides: {
                    type: 'array',
                    description: 'Array of slide objects. Each has type (title|bullets|summary), heading, bullets[], and optional next_steps[].',
                    items: {
                        type: 'object',
                        properties: {
                            type: { type: 'string', enum: ['title', 'bullets', 'summary'], description: 'Slide type' },
                            heading: { type: 'string', description: 'Slide heading text' },
                            bullets: { type: 'array', items: { type: 'string' }, description: 'Bullet point texts' },
                            next_steps: { type: 'array', items: { type: 'string' }, description: 'Next steps (summary slide only)' },
                        },
                    },
                },
                outputFilename: { type: 'string', description: 'Output filename (optional, auto-generated if omitted)' },
                notes: {
                    type: 'object',
                    description: 'Speaker notes config',
                    properties: {
                        enabled: { type: 'boolean' },
                        per_slide: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
            required: ['title', 'slides'],
        },
        execute: async (params) => {
            const spec = {
                title: params.title,
                subtitle: params.subtitle || '',
                slides: params.slides || [],
                notes: params.notes || { enabled: false, per_slide: [] },
            };
            return await createPptxFromSpec(spec, params.outputFilename);
        },
    },

    // ── Admin ────────────────────────────────────────────
    {
        name: 'admin_stats',
        description: 'Get bot statistics (total messages, users, chats). Use when user asks for stats.',
        parameters: { type: 'object', properties: {}, required: [] },
        execute: async () => {
            const stats = getStats();
            return { success: true, stats };
        },
    },
    {
        name: 'admin_clear_history',
        description: 'Clear the conversation history for the current user. Use when user says /clear or /reset.',
        parameters: { type: 'object', properties: {}, required: [] },
        execute: async (params, ctx) => {
            clearConversation(ctx.chatId);
            return { success: true, message: 'History cleared' };
        },
    },
    {
        name: 'admin_backup',
        description: 'Create and send a backup of bot data (owner only).',
        parameters: { type: 'object', properties: {}, required: [] },
        requiresOwner: true,
        execute: async (params, ctx) => {
            if (!ctx.isOwner) return { success: false, error: 'Owner only command' };
            await runBackupNow(ctx.sock);
            return { success: true, message: 'Backup sent' };
        },
    },

    // ── Reminder ─────────────────────────────────────────
    {
        name: 'reminder_create',
        description: 'Create a reminder/alarm for the user. Supports natural language time like "jam 3 sore", "besok jam 10", "30 menit lagi".',
        parameters: {
            type: 'object',
            properties: {
                message: { type: 'string', description: 'Reminder message' },
                time: { type: 'string', description: 'Time in natural language (Indonesian), e.g. "jam 3 sore", "besok jam 10", "30 menit lagi"' },
            },
            required: ['message', 'time'],
        },
        execute: async (params, ctx) => {
            return createReminder(ctx.senderId || ctx.chatId, params.message, params.time);
        },
    },
    {
        name: 'reminder_list',
        description: 'List all active reminders for the user.',
        parameters: { type: 'object', properties: {}, required: [] },
        execute: async (params, ctx) => {
            return { success: true, message: listReminders(ctx.senderId || ctx.chatId) };
        },
    },
    {
        name: 'reminder_delete',
        description: 'Delete a specific reminder by ID.',
        parameters: {
            type: 'object',
            properties: {
                reminder_id: { type: 'number', description: 'Reminder ID to delete' },
            },
            required: ['reminder_id'],
        },
        execute: async (params, ctx) => {
            return deleteReminder(ctx.senderId || ctx.chatId, params.reminder_id);
        },
    },

    // ── Memory ───────────────────────────────────────────
    {
        name: 'memory_save',
        description: 'Save a piece of information to long-term memory that persists across sessions. Use for user preferences, facts, lessons, events.',
        parameters: {
            type: 'object',
            properties: {
                key: { type: 'string', description: 'Short key/label for the memory' },
                value: { type: 'string', description: 'The information to remember' },
                category: { type: 'string', description: 'Category: preference, fact, event, or lesson', enum: ['preference', 'fact', 'event', 'lesson'] },
            },
            required: ['key', 'value'],
        },
        execute: async (params, ctx) => {
            return saveMemory(ctx.senderId || ctx.chatId, params.key, params.value, params.category || 'fact');
        },
    },
    {
        name: 'memory_search',
        description: 'Search long-term memory for information about the user.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query' },
            },
            required: ['query'],
        },
        execute: async (params, ctx) => {
            const results = searchMemory(ctx.senderId || ctx.chatId, params.query);
            return { success: true, memories: results };
        },
    },
    {
        name: 'memory_list',
        description: 'List all stored memories for the user.',
        parameters: { type: 'object', properties: {}, required: [] },
        execute: async (params, ctx) => {
            return { success: true, message: listMemories(ctx.senderId || ctx.chatId) };
        },
    },
    {
        name: 'memory_delete',
        description: 'Delete a specific memory by ID.',
        parameters: {
            type: 'object',
            properties: {
                memory_id: { type: 'number', description: 'Memory ID to delete' },
            },
            required: ['memory_id'],
        },
        execute: async (params, ctx) => {
            return deleteMemory(ctx.senderId || ctx.chatId, params.memory_id);
        },
    },

    // ── URL Summarizer ───────────────────────────────────
    {
        name: 'url_summarize',
        description: 'Fetch and summarize a web article or page. Use when user shares a URL or asks to summarize a webpage.',
        parameters: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL to summarize' },
            },
            required: ['url'],
        },
        execute: async (params, ctx) => {
            const aiCall = ctx.aiCall || ((prompt) => prompt);
            return summarizeUrl(params.url, aiCall);
        },
    },

    // ── Notes & Todo ─────────────────────────────────────
    {
        name: 'note_create',
        description: 'Create a new text note for the user.',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Note title' },
                content: { type: 'string', description: 'Note content' },
            },
            required: ['title'],
        },
        execute: async (params, ctx) => {
            return createNote(ctx.senderId || ctx.chatId, params.title, params.content);
        },
    },
    {
        name: 'todo_create',
        description: 'Create a new todo/task item for the user.',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Todo description' },
            },
            required: ['title'],
        },
        execute: async (params, ctx) => {
            return createTodo(ctx.senderId || ctx.chatId, params.title);
        },
    },
    {
        name: 'note_list',
        description: 'List all notes for the user.',
        parameters: { type: 'object', properties: {}, required: [] },
        execute: async (params, ctx) => {
            return { success: true, message: listNotes(ctx.senderId || ctx.chatId) };
        },
    },
    {
        name: 'todo_list',
        description: 'List all todos for the user.',
        parameters: { type: 'object', properties: {}, required: [] },
        execute: async (params, ctx) => {
            return { success: true, message: listTodos(ctx.senderId || ctx.chatId) };
        },
    },
    {
        name: 'todo_toggle',
        description: 'Toggle a todo item between done and active.',
        parameters: {
            type: 'object',
            properties: {
                todo_id: { type: 'number', description: 'Todo ID to toggle' },
            },
            required: ['todo_id'],
        },
        execute: async (params, ctx) => {
            return toggleTodo(ctx.senderId || ctx.chatId, params.todo_id);
        },
    },
    {
        name: 'note_search',
        description: 'Search notes by keyword.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search keyword' },
            },
            required: ['query'],
        },
        execute: async (params, ctx) => {
            const results = searchNotes(ctx.senderId || ctx.chatId, params.query);
            return { success: true, notes: results };
        },
    },
    {
        name: 'note_delete',
        description: 'Delete a note or todo by ID.',
        parameters: {
            type: 'object',
            properties: {
                note_id: { type: 'number', description: 'Note/todo ID to delete' },
            },
            required: ['note_id'],
        },
        execute: async (params, ctx) => {
            return deleteNote(ctx.senderId || ctx.chatId, params.note_id);
        },
    },

    // ── Translate ────────────────────────────────────────
    {
        name: 'translate_text',
        description: 'Translate text to another language. Supports 20 languages: id, en, ja, ko, zh, ar, es, fr, de, it, pt, ru, th, vi, ms, hi, tr, nl, pl, sv.',
        parameters: {
            type: 'object',
            properties: {
                text: { type: 'string', description: 'Text to translate' },
                target_language: { type: 'string', description: 'Target language code (e.g. en, ja, ko, id)' },
            },
            required: ['text', 'target_language'],
        },
        execute: async (params, ctx) => {
            const { SUPPORTED_LANGUAGES, formatTranslation } = require('./translateHandler');
            const langName = SUPPORTED_LANGUAGES[params.target_language?.toLowerCase()];
            if (!langName) return { success: false, error: `Bahasa "${params.target_language}" ga didukung` };
            const aiCall = ctx.aiCall || ((prompt) => prompt);
            const result = await translateText(params.text, langName, aiCall);
            return { success: true, message: formatTranslation(params.text, result, langName) };
        },
    },

    // ── GIF Search ───────────────────────────────────────
    {
        name: 'gif_search',
        description: 'Search for a GIF by keyword. Returns a GIF URL that can be sent as media.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search keyword for GIF' },
            },
            required: ['query'],
        },
        execute: async (params) => {
            const results = await searchGif(params.query, 1);
            if (!results.length) return { success: false, error: 'Ga nemu GIF buat query itu' };
            return { success: true, gif: results[0] };
        },
    },

    // ── QR Code ──────────────────────────────────────────
    {
        name: 'qr_generate',
        description: 'Generate a QR code image from text or URL.',
        parameters: {
            type: 'object',
            properties: {
                content: { type: 'string', description: 'Text or URL to encode as QR code' },
            },
            required: ['content'],
        },
        execute: async (params) => {
            const buffer = await generateQRCode(params.content);
            return { success: true, qrBuffer: buffer, content: params.content };
        },
    },

    // ── PDF Editor ───────────────────────────────────────
    {
        name: 'pdf_info',
        description: 'Get info about a PDF file (page count, title, author).',
        parameters: { type: 'object', properties: {}, required: [] },
        execute: async (params, ctx) => {
            if (!ctx.documentBuffer) return { success: false, error: 'Ga ada file PDF yang dikirim' };
            const info = await getPDFInfo(ctx.documentBuffer);
            return { success: true, ...info };
        },
    },
    {
        name: 'pdf_extract_pages',
        description: 'Extract specific pages from a PDF file.',
        parameters: {
            type: 'object',
            properties: {
                pages: { type: 'string', description: 'Page numbers to extract, e.g. "1,3,5" or "1-5"' },
            },
            required: ['pages'],
        },
        execute: async (params, ctx) => {
            if (!ctx.documentBuffer) return { success: false, error: 'Ga ada file PDF yang dikirim' };
            const { parsePageRange } = require('./pdfEditorHandler');
            const pageNums = parsePageRange(params.pages);
            const buffer = await extractPages(ctx.documentBuffer, pageNums);
            return { success: true, pdfBuffer: buffer, pageCount: pageNums.length };
        },
    },

    // ── Poll ─────────────────────────────────────────────
    {
        name: 'poll_create',
        description: 'Create a poll in the current chat. Question and options separated by pipe (|).',
        parameters: {
            type: 'object',
            properties: {
                question: { type: 'string', description: 'Poll question' },
                options: { type: 'array', items: { type: 'string' }, description: 'Array of poll options (2-10)' },
            },
            required: ['question', 'options'],
        },
        execute: async (params, ctx) => {
            return createPoll(ctx.chatId, ctx.senderId || ctx.chatId, params.question, params.options);
        },
    },
    {
        name: 'poll_vote',
        description: 'Vote in the active poll.',
        parameters: {
            type: 'object',
            properties: {
                option_number: { type: 'number', description: 'Option number to vote for (1-based)' },
            },
            required: ['option_number'],
        },
        execute: async (params, ctx) => {
            return votePoll(ctx.chatId, ctx.senderId || ctx.chatId, params.option_number);
        },
    },
    {
        name: 'poll_results',
        description: 'Show current poll results.',
        parameters: { type: 'object', properties: {}, required: [] },
        execute: async (params, ctx) => {
            return { success: true, message: showPollResults(ctx.chatId) };
        },
    },
    {
        name: 'poll_close',
        description: 'Close the active poll and show final results (creator or owner only).',
        parameters: { type: 'object', properties: {}, required: [] },
        execute: async (params, ctx) => {
            const ownerJid = process.env.OWNER_JID || '';
            return closePoll(ctx.chatId, ctx.senderId || ctx.chatId, ownerJid);
        },
    },

    // ── Calculator ───────────────────────────────────────
    {
        name: 'calculator_eval',
        description: 'Evaluate a math expression. Supports basic math, trig, log, sqrt, factorial, etc. Examples: "2+2", "sqrt(144)", "sin(pi/4)".',
        parameters: {
            type: 'object',
            properties: {
                expression: { type: 'string', description: 'Math expression to evaluate' },
            },
            required: ['expression'],
        },
        execute: async (params) => {
            return calculateExpression(params.expression);
        },
    },
    {
        name: 'calculator_convert_unit',
        description: 'Convert between units. Examples: "100 km to mile", "32 degF to degC".',
        parameters: {
            type: 'object',
            properties: {
                value: { type: 'number', description: 'Numeric value' },
                from_unit: { type: 'string', description: 'Source unit (e.g. km, kg, degC)' },
                to_unit: { type: 'string', description: 'Target unit (e.g. mile, lb, degF)' },
            },
            required: ['value', 'from_unit', 'to_unit'],
        },
        execute: async (params) => {
            return convertUnit(params.value, params.from_unit, params.to_unit);
        },
    },
    {
        name: 'calculator_convert_currency',
        description: 'Convert between currencies using live exchange rates. Examples: "100 USD to IDR".',
        parameters: {
            type: 'object',
            properties: {
                amount: { type: 'number', description: 'Amount to convert' },
                from_currency: { type: 'string', description: 'Source currency code (e.g. USD, EUR, IDR)' },
                to_currency: { type: 'string', description: 'Target currency code' },
            },
            required: ['amount', 'from_currency', 'to_currency'],
        },
        execute: async (params) => {
            return convertCurrency(params.amount, params.from_currency, params.to_currency);
        },
    },

    // ── RSS Feeds ────────────────────────────────────────
    {
        name: 'rss_subscribe',
        description: 'Subscribe to an RSS feed.',
        parameters: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'RSS feed URL' },
                label: { type: 'string', description: 'Optional label for the feed' },
            },
            required: ['url'],
        },
        execute: async (params, ctx) => {
            return subscribeFeed(ctx.senderId || ctx.chatId, params.url, params.label);
        },
    },
    {
        name: 'rss_list',
        description: 'List all subscribed RSS feeds.',
        parameters: { type: 'object', properties: {}, required: [] },
        execute: async (params, ctx) => {
            return { success: true, message: listFeeds(ctx.senderId || ctx.chatId) };
        },
    },
    {
        name: 'rss_unsubscribe',
        description: 'Unsubscribe from an RSS feed by ID.',
        parameters: {
            type: 'object',
            properties: {
                feed_id: { type: 'number', description: 'Feed ID to unsubscribe' },
            },
            required: ['feed_id'],
        },
        execute: async (params, ctx) => {
            return unsubscribeFeed(ctx.senderId || ctx.chatId, params.feed_id);
        },
    },
    {
        name: 'rss_check',
        description: 'Check for new articles in all subscribed RSS feeds.',
        parameters: { type: 'object', properties: {}, required: [] },
        execute: async (params, ctx) => {
            const { formatFeedUpdates } = require('./rssHandler');
            const updates = await checkUserFeeds(ctx.senderId || ctx.chatId);
            const formatted = formatFeedUpdates(updates);
            return { success: true, message: formatted || 'Ga ada artikel baru dari feed kamu' };
        },
    },

    // ── Image Generation ─────────────────────────────────
    {
        name: 'image_generate',
        description: 'Generate an image using AI (DALL-E). Requires OPENAI_API_KEY to be set.',
        parameters: {
            type: 'object',
            properties: {
                prompt: { type: 'string', description: 'Description of the image to generate' },
                size: { type: 'string', description: 'Image size: 1024x1024, 1792x1024, or 1024x1792', enum: ['1024x1024', '1792x1024', '1024x1792'] },
            },
            required: ['prompt'],
        },
        execute: async (params) => {
            if (!isImageGenAvailable()) return { success: false, error: 'Image gen belum dikonfigurasi (OPENAI_API_KEY not set)' };
            const result = await generateImage(params.prompt, { size: params.size });
            if (!result.success) return result;
            const buffer = await downloadImageBuffer(result.url);
            return { success: true, imageBuffer: buffer, revisedPrompt: result.revisedPrompt };
        },
    },

    // ── Scheduled Messages ───────────────────────────────
    {
        name: 'schedule_message',
        description: 'Schedule a message to be sent at a specific time.',
        parameters: {
            type: 'object',
            properties: {
                message: { type: 'string', description: 'Message to send' },
                time: { type: 'string', description: 'When to send, natural language (Indonesian)' },
                target_chat: { type: 'string', description: 'Target chat ID (optional, owner only for other chats)' },
            },
            required: ['message', 'time'],
        },
        execute: async (params, ctx) => {
            const target = params.target_chat || ctx.chatId;
            const isOwner = ctx.isOwner || false;
            return scheduleMessage(ctx.senderId || ctx.chatId, target, params.message, params.time, isOwner);
        },
    },
    {
        name: 'schedule_list',
        description: 'List all scheduled messages.',
        parameters: { type: 'object', properties: {}, required: [] },
        execute: async (params, ctx) => {
            return { success: true, message: listScheduledMessages(ctx.senderId || ctx.chatId) };
        },
    },

    // ── Allowlist Management (owner only) ─────────────────
    {
        name: 'allowlist_add',
        description: 'Add a phone number to the bot allowlist. Owner only.',
        requiresOwner: true,
        parameters: {
            type: 'object',
            properties: {
                phone_number: { type: 'string', description: 'Phone number to allow (format: 628xxx)' },
                display_name: { type: 'string', description: 'Display name (optional)' },
            },
            required: ['phone_number'],
        },
        execute: async (params, ctx) => {
            const { addNumber } = require('./allowlistManager');
            const r = addNumber(params.phone_number, params.display_name || null, ctx.senderId || 'owner', null);
            if (!r) return { success: false, error: 'Format nomor ga valid' };
            return { success: true, message: `${r.phone_number} ditambahin ke allowlist` };
        },
    },
    {
        name: 'allowlist_remove',
        description: 'Remove a phone number from the bot allowlist. Owner only.',
        requiresOwner: true,
        parameters: {
            type: 'object',
            properties: {
                phone_number: { type: 'string', description: 'Phone number to remove' },
            },
            required: ['phone_number'],
        },
        execute: async (params, ctx) => {
            const { removeNumber } = require('./allowlistManager');
            const ok = removeNumber(params.phone_number);
            return { success: ok, message: ok ? 'Dihapus dari allowlist' : 'Nomor ga ketemu' };
        },
    },
    {
        name: 'allowlist_view',
        description: 'View all allowlist entries. Owner only.',
        requiresOwner: true,
        parameters: { type: 'object', properties: {}, required: [] },
        execute: async (params, ctx) => {
            const { getAll, getStats } = require('./allowlistManager');
            const entries = getAll();
            const stats = getStats();
            return { success: true, entries, stats };
        },
    },
    {
        name: 'allowlist_toggle',
        description: 'Toggle a phone number active/inactive in allowlist. Owner only.',
        requiresOwner: true,
        parameters: {
            type: 'object',
            properties: {
                phone_number: { type: 'string', description: 'Phone number to toggle' },
                is_active: { type: 'boolean', description: 'true to activate, false to deactivate' },
            },
            required: ['phone_number', 'is_active'],
        },
        execute: async (params, ctx) => {
            const { toggleNumber } = require('./allowlistManager');
            const ok = toggleNumber(params.phone_number, params.is_active);
            return { success: ok, message: ok ? `Nomor ${params.is_active ? 'diaktifkan' : 'dinonaktifkan'}` : 'Nomor ga ketemu' };
        },
    },
];

/**
 * Get all tools
 */
const getAllTools = () => TOOLS;

/**
 * Get tool by name
 */
const getToolByName = (name) => TOOLS.find(t => t.name === name) || null;

/**
 * Generate tools schema for Copilot API (OpenAI-compatible format)
 * This is what gets injected into the API call as `tools`
 */
const getToolsForAPI = () => {
    return TOOLS
        .filter(t => !t.requiresOwner) // exclude owner-only from normal API calls
        .map(t => ({
            type: 'function',
            function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters,
            },
        }));
};

/**
 * Generate tools schema including owner-only tools
 */
const getToolsForOwner = () => {
    return TOOLS.map(t => ({
        type: 'function',
        function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
        },
    }));
};

/**
 * Execute a tool by name with given parameters and context
 */
const executeTool = async (toolName, params, ctx) => {
    const tool = getToolByName(toolName);
    if (!tool) {
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
    // Owner-only guard
    if (tool.requiresOwner && !(ctx && ctx.isOwner)) {
        return { success: false, error: 'Hanya owner yang bisa pake tool ini' };
    }
    // Feature toggle guard
    try {
        const { isFeatureEnabled } = require('./database');
        if (toolName.startsWith('allowlist_')) { /* allowlist always available */ }
        else if (!isFeatureEnabled(toolName)) {
            return { success: false, error: `Fitur ${toolName} sedang dinonaktifkan oleh admin` };
        }
    } catch (e) { /* toggle check failure = allow */ }
    try {
        const result = await tool.execute(params || {}, ctx || {});
        return result;
    } catch (err) {
        console.error(`[ToolRegistry] Error executing ${toolName}:`, err.message);
        return { success: false, error: err.message };
    }
};

/**
 * Generate a compact tool summary for prompt injection
 * (shorter than full schema, used in capability cards)
 */
const getToolSummary = () => {
    return TOOLS.map(t => {
        const paramNames = Object.keys(t.parameters.properties || {});
        return `${t.name}(${paramNames.join(', ')}): ${t.description.split('.')[0]}`;
    }).join('\n');
};

module.exports = {
    TOOLS,
    getAllTools,
    getToolByName,
    getToolsForAPI,
    getToolsForOwner,
    executeTool,
    getToolSummary,
};
