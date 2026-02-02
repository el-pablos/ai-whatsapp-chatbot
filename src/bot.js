/**
 * AI WhatsApp Chatbot - Main Bot Service v2.1
 * 
 * Bot WhatsApp menggunakan @whiskeysockets/baileys dengan:
 * - Persona AI "Tama" via Copilot API
 * - Unlimited conversation memory (SQLite)
 * - Image/file understanding (Vision API)
 * - Location sharing (OpenStreetMap)
 * - Reply detection
 * - Ethnicity detection (fun feature)
 * - Calendar & holiday checker
 * - Auto reconnect handling
 * - Health Check server
 * - Cloudflare DNS automation
 * 
 * @author Tama El Pablo
 * @version 2.1.0
 */

// Load environment variables
require('dotenv').config();

const makeWASocket = require('@whiskeysockets/baileys').default;
const { 
    useMultiFileAuthState, 
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    downloadMediaMessage
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// Import modules
const { fetchCopilotResponse, fetchVisionResponse, getSystemPrompt } = require('./aiHandler');
const { startHealthCheckServer } = require('./healthCheck');
const { syncDNSRecord } = require('./dnsUpdater');
const { 
    initDatabase, 
    saveMessage, 
    getConversationHistory, 
    getMessageById,
    closeDatabase 
} = require('./database');
const { 
    downloadMedia, 
    getMediaType, 
    getMediaCaption, 
    hasMedia,
    analyzeImage,
    analyzeDocument,
    detectEthnicity
} = require('./mediaHandler');
const {
    searchPlace,
    formatLocationMessage,
    formatLocationText,
    parseLocationRequest,
    handleIncomingLocation,
    isLocationRequest
} = require('./locationHandler');
const {
    detectCalendarIntent,
    formatCalendarResponse,
    parseDateFromString,
    getTodayInfo
} = require('./calendarHandler');

// Logger dengan level minimal untuk produksi
const logger = pino({ 
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        target: 'pino-pretty',
        options: { colorize: true }
    }
}).child({ module: 'bot' });

// State untuk tracking koneksi
let sock = null;
let isConnecting = false;
let reconnectAttempts = 0;
let pairingCodeRequested = false;
let isAuthenticated = false; // Track if we have valid auth
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_INTERVAL = 5000; // 5 detik

// Auth method configuration
const AUTH_METHOD = process.env.WA_AUTH_METHOD || 'qr'; // 'qr' atau 'pairing'
const PHONE_NUMBER = process.env.WA_PHONE_NUMBER || '';

// Auth folder
const AUTH_FOLDER = 'auth_info_baileys';

/**
 * Check if auth folder has valid credentials
 */
const hasValidCredentials = () => {
    try {
        const credsPath = path.join(AUTH_FOLDER, 'creds.json');
        if (fs.existsSync(credsPath)) {
            const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
            // Check if we have essential credentials
            return !!(creds.me && creds.me.id);
        }
        return false;
    } catch (error) {
        return false;
    }
};

/**
 * Inisialisasi dan connect ke WhatsApp
 */
const connectToWhatsApp = async () => {
    if (isConnecting) {
        console.log('[Bot] Already connecting, skip...');
        return;
    }

    isConnecting = true;
    pairingCodeRequested = false;

    try {
        // Initialize database
        initDatabase();
        
        // Load auth state dari folder
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
        
        // Fetch versi Baileys terbaru
        const { version } = await fetchLatestBaileysVersion();
        console.log(`[Bot] Using Baileys version: ${version.join('.')}`);
        console.log(`[Bot] Auth method: ${AUTH_METHOD.toUpperCase()}`);

        // Buat socket connection
        sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger)
            },
            logger,
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: false,
            syncFullHistory: false,
            getMessage: async (key) => {
                // Try to get message from database
                const msg = getMessageById(key.id);
                return msg ? { conversation: msg.content } : undefined;
            }
        });

        // Handle credentials update
        sock.ev.on('creds.update', saveCreds);

        // Handle connection update
        sock.ev.on('connection.update', (update) => handleConnectionUpdate(update, state));

        // Handle incoming messages
        sock.ev.on('messages.upsert', handleMessagesUpsert);

        console.log('[Bot] Socket created, waiting for connection...');

    } catch (error) {
        console.error('[Bot] Error during connection:', error.message);
        isConnecting = false;
        scheduleReconnect();
    }
};

/**
 * Handle connection state updates
 */
const handleConnectionUpdate = async (update, state) => {
    const { connection, lastDisconnect, qr } = update;

    // Check if we already have valid credentials - skip pairing code request
    const hasExistingAuth = hasValidCredentials() || state.creds?.me?.id;
    
    // Handle pairing code method - ONLY if no existing auth
    if (AUTH_METHOD === 'pairing' && !hasExistingAuth && !pairingCodeRequested && !isAuthenticated) {
        if (PHONE_NUMBER) {
            pairingCodeRequested = true;
            console.log('[Bot] No existing auth found, requesting pairing code untuk nomor:', PHONE_NUMBER);
            
            setTimeout(async () => {
                try {
                    const code = await sock.requestPairingCode(PHONE_NUMBER);
                    console.log('╔═══════════════════════════════════════════════════════════╗');
                    console.log('║              📱 PAIRING CODE (Masukkan di WA)             ║');
                    console.log('╠═══════════════════════════════════════════════════════════╣');
                    console.log(`║                        ${code}                        ║`);
                    console.log('╠═══════════════════════════════════════════════════════════╣');
                    console.log('║  Buka WhatsApp > Linked Devices > Link a Device           ║');
                    console.log('║  Pilih "Link with phone number instead"                   ║');
                    console.log('║  Masukkan code di atas                                    ║');
                    console.log('╚═══════════════════════════════════════════════════════════╝');
                } catch (err) {
                    console.error('[Bot] Error requesting pairing code:', err.message);
                    pairingCodeRequested = false;
                }
            }, 3000);
        } else {
            console.error('[Bot] WA_PHONE_NUMBER tidak diset!');
        }
    } else if (hasExistingAuth && !isAuthenticated) {
        console.log('[Bot] Existing credentials found, reconnecting without new pairing code...');
    }

    // Handle QR code method - only if no existing auth
    if (AUTH_METHOD === 'qr' && qr && !hasExistingAuth) {
        console.log('[Bot] QR Code received - scan dengan WA kamu ya bro! 📱');
        qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
        isConnecting = false;
        isAuthenticated = false;
        
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(`[Bot] Connection closed. Status: ${statusCode}`);

        if (shouldReconnect) {
            console.log('[Bot] Bukan logout, attempting reconnect...');
            scheduleReconnect();
        } else {
            console.log('[Bot] Logged out dari WA, hapus folder auth_info_baileys untuk scan ulang');
            isAuthenticated = false;
            reconnectAttempts = 0;
        }
    }

    if (connection === 'open') {
        isConnecting = false;
        isAuthenticated = true;
        reconnectAttempts = 0;
        pairingCodeRequested = false; // Reset for future reconnects
        console.log('[Bot] ✅ Connected to WhatsApp successfully! Siap nerima pesan jir 🚀');
    }
};

/**
 * Schedule reconnection dengan delay
 */
const scheduleReconnect = () => {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error(`[Bot] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Stopping...`);
        return;
    }

    reconnectAttempts++;
    const delay = RECONNECT_INTERVAL * reconnectAttempts;
    
    console.log(`[Bot] Reconnecting in ${delay/1000}s... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    
    setTimeout(() => {
        connectToWhatsApp();
    }, delay);
};

/**
 * Handle incoming messages
 */
const handleMessagesUpsert = async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
        try {
            await processMessage(msg);
        } catch (error) {
            console.error('[Bot] Error processing message:', error.message);
        }
    }
};

/**
 * Process individual message
 */
const processMessage = async (msg) => {
    // Skip if from self or status broadcast
    if (msg.key.fromMe) return;
    if (msg.key.remoteJid === 'status@broadcast') return;

    const sender = msg.key.remoteJid;
    const pushName = msg.pushName || 'Bro';
    const messageId = msg.key.id;

    // Extract quoted message info (for reply detection)
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedMessageId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
    let quotedContent = null;
    
    if (quotedMsg) {
        quotedContent = quotedMsg.conversation || 
                       quotedMsg.extendedTextMessage?.text ||
                       '[media]';
        console.log(`[Bot] User is replying to: "${quotedContent.slice(0, 50)}..."`);
    }

    // Check for location message from user
    const locationMsg = msg.message?.locationMessage;
    if (locationMsg) {
        await handleUserLocation(msg, sender, pushName, locationMsg);
        return;
    }

    // Check for media message
    if (hasMedia(msg)) {
        await handleMediaMessage(msg, sender, pushName, quotedContent, messageId);
        return;
    }

    // Extract text content
    const textContent = msg.message?.conversation || 
                       msg.message?.extendedTextMessage?.text ||
                       null;

    if (!textContent) return;

    console.log(`[Bot] Pesan dari ${pushName} (${sender}): ${textContent}`);

    // Check for special commands
    if (await handleSpecialCommands(msg, sender, textContent)) {
        return;
    }

    // Check for location request
    const locationReq = parseLocationRequest(textContent);
    if (locationReq) {
        await handleLocationRequest(msg, sender, locationReq.query);
        return;
    }

    // Check for calendar-related queries (natural language)
    const calendarIntent = detectCalendarIntent(textContent);
    if (calendarIntent) {
        let calendarResponse = null;
        
        // Check if user provided date info in the message
        const parsedDate = parseDateFromString(textContent);
        
        if (calendarIntent.intent === 'zodiac' && parsedDate) {
            calendarResponse = formatCalendarResponse('zodiac', { 
                month: parsedDate.month, 
                day: parsedDate.day 
            });
        } else if (calendarIntent.intent === 'birthday' && parsedDate && parsedDate.year) {
            calendarResponse = formatCalendarResponse('birthday', {
                year: parsedDate.year,
                month: parsedDate.month,
                day: parsedDate.day
            });
        } else if (calendarIntent.intent === 'calendar') {
            calendarResponse = formatCalendarResponse('calendar', { month: calendarIntent.month });
        } else {
            calendarResponse = formatCalendarResponse(calendarIntent.intent);
        }
        
        if (calendarResponse) {
            await sock.sendMessage(sender, { text: calendarResponse }, { quoted: msg });
            return;
        }
    }

    // Save user message to database
    saveMessage({
        chatId: sender,
        senderJid: sender,
        senderName: pushName,
        role: 'user',
        content: textContent,
        messageId: messageId,
        quotedMessageId: quotedMessageId,
        quotedContent: quotedContent
    });

    // Send typing indicator
    await sock.sendPresenceUpdate('composing', sender);

    try {
        // Get conversation history from database
        const history = getConversationHistory(sender);
        
        // Fetch AI response with context
        const aiResponse = await fetchCopilotResponse(textContent, history, {
            quotedContent: quotedContent
        });

        console.log(`[Bot] Response untuk ${pushName}: ${aiResponse.slice(0, 100)}...`);

        // Save AI response to database
        saveMessage({
            chatId: sender,
            senderJid: 'bot',
            senderName: 'Tama',
            role: 'assistant',
            content: aiResponse,
            messageId: `bot_${Date.now()}`
        });

        // Send response
        await sock.sendMessage(sender, { text: aiResponse }, { quoted: msg });

    } catch (error) {
        console.error('[Bot] Error getting AI response:', error.message);
        await sock.sendMessage(sender, {
            text: 'duh error euy sistem w 😓 coba lgi nnt ya'
        }, { quoted: msg });
    }

    await sock.sendPresenceUpdate('paused', sender);
};

/**
 * Handle special commands
 */
const handleSpecialCommands = async (msg, sender, text) => {
    const lowerText = text.toLowerCase().trim();

    // Command: /clear - clear conversation history
    if (lowerText === '/clear' || lowerText === '/reset') {
        const { clearConversation } = require('./database');
        clearConversation(sender);
        await sock.sendMessage(sender, { 
            text: 'okei bro, history chat udh w hapus. fresh start! 🔄' 
        }, { quoted: msg });
        return true;
    }

    // Command: /stats - show stats
    if (lowerText === '/stats') {
        const { getStats } = require('./database');
        const stats = getStats();
        await sock.sendMessage(sender, {
            text: `📊 *Bot Stats*\n\nTotal pesan: ${stats.totalMessages}\nTotal users: ${stats.totalUsers}\nTotal chats: ${stats.totalChats}`
        }, { quoted: msg });
        return true;
    }

    // Command: /help
    if (lowerText === '/help' || lowerText === '/bantuan') {
        await sock.sendMessage(sender, {
            text: `🤖 *Tama Bot v2.1*\n\nFitur:\n• Chat biasa - w bales pake gaya Tama\n• Kirim gambar - w bisa analisis\n• Kirim lokasi - w tau dimana lu\n• Minta lokasi tempat - "kirim lokasi starbucks"\n• Reply chat - w paham konteks nya\n• Cek tanggal/kalender - "tanggal hari ini"\n\nCommands:\n• /clear - hapus history chat\n• /stats - lihat statistik\n• /kalender - lihat kalender bulan ini\n• /libur - cek libur nasional\n• /zodiak [tgl] - cek zodiak\n• /tebaksuku - kirim foto muka, w tebak suku nya (fun)\n• /help - bantuan ini\n\neuy tinggal chat aja santai 😎`
        }, { quoted: msg });
        return true;
    }

    // Command: /kalender - show calendar
    if (lowerText === '/kalender' || lowerText === '/calendar') {
        const calendarText = formatCalendarResponse('calendar');
        await sock.sendMessage(sender, { text: calendarText }, { quoted: msg });
        return true;
    }

    // Command: /libur - show upcoming holidays
    if (lowerText === '/libur' || lowerText === '/holiday' || lowerText === '/holidays') {
        const holidayText = formatCalendarResponse('holidays');
        await sock.sendMessage(sender, { text: holidayText }, { quoted: msg });
        return true;
    }

    // Command: /today - show today info
    if (lowerText === '/today' || lowerText === '/hari ini' || lowerText === '/tanggal') {
        const todayText = formatCalendarResponse('today');
        await sock.sendMessage(sender, { text: todayText }, { quoted: msg });
        return true;
    }

    // Command: /zodiak [date] - check zodiac
    if (lowerText.startsWith('/zodiak') || lowerText.startsWith('/zodiac')) {
        const dateStr = lowerText.replace(/^\/zodia[ck]\s*/i, '').trim();
        if (dateStr) {
            const parsed = parseDateFromString(dateStr);
            if (parsed) {
                const zodiacText = formatCalendarResponse('zodiac', { month: parsed.month, day: parsed.day });
                await sock.sendMessage(sender, { text: zodiacText }, { quoted: msg });
            } else {
                await sock.sendMessage(sender, { 
                    text: 'format tanggal nya salah bro, coba: /zodiak 1 januari atau /zodiak 1/1' 
                }, { quoted: msg });
            }
        } else {
            await sock.sendMessage(sender, { 
                text: 'tambahin tanggal lahir nya dong\ncontoh: /zodiak 1 januari atau /zodiak 1/1' 
            }, { quoted: msg });
        }
        return true;
    }

    // Command: /ultah [date] - check birthday info
    if (lowerText.startsWith('/ultah') || lowerText.startsWith('/birthday')) {
        const dateStr = lowerText.replace(/^\/(ultah|birthday)\s*/i, '').trim();
        if (dateStr) {
            const parsed = parseDateFromString(dateStr);
            if (parsed && parsed.year) {
                const birthdayText = formatCalendarResponse('birthday', { 
                    year: parsed.year, 
                    month: parsed.month, 
                    day: parsed.day 
                });
                await sock.sendMessage(sender, { text: birthdayText }, { quoted: msg });
            } else {
                await sock.sendMessage(sender, { 
                    text: 'tambahin tahun lahir nya jg dong\ncontoh: /ultah 1 januari 2000 atau /ultah 1/1/2000' 
                }, { quoted: msg });
            }
        } else {
            await sock.sendMessage(sender, { 
                text: 'kasih tanggal lahir lengkap nya dong\ncontoh: /ultah 1 januari 2000' 
            }, { quoted: msg });
        }
        return true;
    }

    // Command: /tebaksuku - trigger ethnicity detection
    if (lowerText === '/tebaksuku' || lowerText === '/tebak suku') {
        await sock.sendMessage(sender, {
            text: 'kirim foto muka nya dong bro, ntar w tebak suku nya 📸\n\n(kirim gambar abis ini)'
        }, { quoted: msg });
        // Set flag untuk next image
        return true;
    }

    return false;
};

/**
 * Handle media messages (images, documents, etc)
 */
const handleMediaMessage = async (msg, sender, pushName, quotedContent, messageId) => {
    const mediaType = getMediaType(msg);
    const caption = getMediaCaption(msg);
    
    console.log(`[Bot] Media ${mediaType} dari ${pushName}: ${caption || '(no caption)'}`);

    await sock.sendPresenceUpdate('composing', sender);

    try {
        // Download media
        const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            { logger: console, reuploadRequest: sock.updateMediaMessage }
        );

        const mimetype = msg.message?.imageMessage?.mimetype ||
                        msg.message?.documentMessage?.mimetype ||
                        'application/octet-stream';

        // Save to database
        saveMessage({
            chatId: sender,
            senderJid: sender,
            senderName: pushName,
            role: 'user',
            content: caption || `[${mediaType}]`,
            messageId: messageId,
            mediaType: mediaType,
            mediaCaption: caption
        });

        let aiResponse;

        // Check if user wants ethnicity detection
        const lowerCaption = (caption || '').toLowerCase();
        if (mediaType === 'image' && (lowerCaption.includes('tebak suku') || lowerCaption.includes('suku apa'))) {
            aiResponse = await detectEthnicity(buffer, mimetype);
        }
        // Handle image with vision
        else if (mediaType === 'image') {
            const history = getConversationHistory(sender);
            const base64 = buffer.toString('base64');
            aiResponse = await fetchVisionResponse(base64, mimetype, caption, history);
        }
        // Handle documents
        else if (mediaType === 'document') {
            const filename = msg.message?.documentMessage?.fileName || 'unknown';
            const docInfo = await analyzeDocument(buffer, filename, mimetype);
            
            const history = getConversationHistory(sender);
            aiResponse = await fetchCopilotResponse(
                `User kirim file: ${filename}`,
                history,
                { mediaDescription: docInfo }
            );
        }
        else {
            aiResponse = `oh ${mediaType} ya, w liat nih 👀`;
        }

        // Save response
        saveMessage({
            chatId: sender,
            senderJid: 'bot',
            senderName: 'Tama',
            role: 'assistant',
            content: aiResponse,
            messageId: `bot_${Date.now()}`
        });

        await sock.sendMessage(sender, { text: aiResponse }, { quoted: msg });

    } catch (error) {
        console.error('[Bot] Error processing media:', error.message);
        await sock.sendMessage(sender, {
            text: 'duh error pas proses media nya 😓 coba kirim ulang bro'
        }, { quoted: msg });
    }

    await sock.sendPresenceUpdate('paused', sender);
};

/**
 * Handle location request (user minta lokasi tempat)
 */
const handleLocationRequest = async (msg, sender, query) => {
    console.log(`[Bot] Location request: ${query}`);
    
    await sock.sendPresenceUpdate('composing', sender);

    try {
        const places = await searchPlace(query, { limit: 3 });

        if (places.length === 0) {
            await sock.sendMessage(sender, {
                text: `aduh ga nemu "${query}" jir 😭 coba pake kata kunci lain bro`
            }, { quoted: msg });
            return;
        }

        const place = places[0]; // Ambil yang paling relevan

        // Send text info first
        await sock.sendMessage(sender, {
            text: formatLocationText(place)
        }, { quoted: msg });

        // Then send location
        await sock.sendMessage(sender, formatLocationMessage(place));

        // Save to database
        saveMessage({
            chatId: sender,
            senderJid: 'bot',
            senderName: 'Tama',
            role: 'assistant',
            content: `[Shared location: ${place.name}]`,
            messageId: `bot_${Date.now()}`
        });

    } catch (error) {
        console.error('[Bot] Error handling location request:', error.message);
        await sock.sendMessage(sender, {
            text: 'duh error pas nyari lokasi 😓 coba lgi ya'
        }, { quoted: msg });
    }

    await sock.sendPresenceUpdate('paused', sender);
};

/**
 * Handle incoming user location
 */
const handleUserLocation = async (msg, sender, pushName, locationMsg) => {
    console.log(`[Bot] Received location from ${pushName}`);

    await sock.sendPresenceUpdate('composing', sender);

    try {
        const locationInfo = await handleIncomingLocation(locationMsg);
        
        // Save to database
        saveMessage({
            chatId: sender,
            senderJid: sender,
            senderName: pushName,
            role: 'user',
            content: `[Shared location: ${locationInfo.address}]`,
            messageId: msg.key.id,
            mediaType: 'location'
        });

        // Get history and respond
        const history = getConversationHistory(sender);
        const aiResponse = await fetchCopilotResponse(
            `User share lokasi nya di: ${locationInfo.address}`,
            history
        );

        // Save response
        saveMessage({
            chatId: sender,
            senderJid: 'bot',
            senderName: 'Tama',
            role: 'assistant',
            content: aiResponse,
            messageId: `bot_${Date.now()}`
        });

        await sock.sendMessage(sender, { text: aiResponse }, { quoted: msg });

    } catch (error) {
        console.error('[Bot] Error handling location:', error.message);
        await sock.sendMessage(sender, {
            text: 'nice, w liat lokasi lu 📍'
        }, { quoted: msg });
    }

    await sock.sendPresenceUpdate('paused', sender);
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async (signal) => {
    console.log(`\n[Bot] Received ${signal}, shutting down gracefully...`);
    
    closeDatabase();
    
    if (sock) {
        try {
            await sock.logout();
        } catch (e) {
            // Ignore logout errors during shutdown
        }
    }

    process.exit(0);
};

/**
 * Main entry point
 */
const main = async () => {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  AI WhatsApp Chatbot - Tama Clone v2.0.0   ║');
    console.log('║  by el-pablos                              ║');
    console.log('║  Features: Memory, Vision, Location, Reply ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('');

    try {
        // 1. Start Health Check Server
        console.log('[Boot] Starting Health Check server...');
        await startHealthCheckServer();

        // 2. Sync DNS Record ke Cloudflare
        console.log('[Boot] Syncing DNS record to Cloudflare...');
        const dnsResult = await syncDNSRecord();
        console.log(`[Boot] DNS sync result: ${dnsResult.action}`);

        // 3. Connect ke WhatsApp
        console.log('[Boot] Connecting to WhatsApp...');
        await connectToWhatsApp();

    } catch (error) {
        console.error('[Boot] Fatal error during startup:', error.message);
        process.exit(1);
    }
};

// Handle process signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (error) => {
    console.error('[Bot] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Bot] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export untuk testing
module.exports = {
    connectToWhatsApp,
    handleConnectionUpdate,
    handleMessagesUpsert,
    processMessage,
    scheduleReconnect,
    main
};

// Run jika dipanggil langsung
if (require.main === module) {
    main();
}
