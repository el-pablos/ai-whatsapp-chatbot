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
];

// ═══════════════════════════════════════════════════════════
//  REGISTRY API
// ═══════════════════════════════════════════════════════════

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
