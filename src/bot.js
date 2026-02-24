/**
 * AI WhatsApp Chatbot - Main Bot Service v2.6
 *
 * Bot WhatsApp menggunakan @whiskeysockets/baileys dengan:
 * - Persona AI "Tama" via Copilot API
 * - Unlimited conversation memory (SQLite)
 * - Image/file understanding (Vision API)
 * - Universal Document Reader (70+ formats - NO LIMITS!)
 * - Reply-to-Media: analyze quoted media without re-sending
 * - File Creator: create & send files (.md, .txt, .csv, .json, etc.)
 * - Real-time Web Search: AI auto-searches internet when needed
 * - YouTube downloader (MP3/MP4)
 * - Location sharing (OpenStreetMap)
 * - Reply detection
 * - Ethnicity detection (fun feature)
 * - Calendar & holiday checker
 * - Mood & Tarot reading
 * - Auto reconnect handling
 * - Persistent auth (auth_info_baileys)
 * - Health Check server
 * - Cloudflare DNS automation
 * 
 * @author Tama El Pablo
 * @version 2.6.0
 */

// Load environment variables
require('dotenv').config();

const crypto = require('crypto');
const makeWASocket = require('@whiskeysockets/baileys').default;
const { 
    useMultiFileAuthState, 
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    downloadMediaMessage,
    Browsers
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// Import modules
const { fetchCopilotResponse, fetchVisionResponse, getSystemPrompt, checkDimensiLainLogic } = require('./aiHandler');
const { startHealthCheckServer } = require('./healthCheck');
const { syncDNSRecord } = require('./dnsUpdater');
const { 
    initDatabase, 
    saveMessage, 
    getConversationHistory, 
    getMessageById,
    getBotResponseAfter,
    closeDatabase,
    isOwner,
    getUserPreferences,
    getPreferredName,
    detectNicknamePreference,
    scheduleRetentionCleanup
} = require('./database');
const { classifyUser } = require('./userProfileHelper');
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
const {
    analyzeMood,
    generateMoodResponse,
    isMoodRequest
} = require('./moodHandler');
const {
    performReading,
    yesNoReading,
    isTarotRequest,
    isYesNoQuestion,
    getSpreadFromMessage
} = require('./tarotHandler');
const {
    splitMessage,
    smartSend,
    WA_MESSAGE_LIMIT
} = require('./messageUtils');
const {
    processDocument,
    isSupportedDocument,
    getDocumentInfo,
    getSupportedFormats
} = require('./documentHandler');
const {
    detectYoutubeUrl,
    processYoutubeUrl,
    downloadAsMP3,
    downloadAsMP4,
    parseFormatResponse,
    cleanupFile,
    checkDependencies
} = require('./youtubeHandler');
const {
    scheduleBackup,
    runBackupNow,
    stopBackup
} = require('./backupHandler');
const {
    transcribeAudio,
    isVoiceNote,
    isAudioMessage,
    getAudioBuffer,
    getAudioFormat
} = require('./voiceHandler');
const {
    isStickerRequest,
    imageToSticker,
    videoToSticker,
    sendSticker
} = require('./stickerHandler');
const {
    detectSearchRequest,
    webSearch,
    formatSearchResult,
    parseWebSearchMarker
} = require('./webSearchHandler');
const {
    detectWeatherQuery,
    processWeatherRequest,
    getWeather,
    getLatestEarthquake
} = require('./weatherHandler');
const { reportBugToOwner } = require('./bugReporter');
const {
    parseFileMarker,
    createAndSendFile,
    detectFileRequest
} = require('./fileCreator');

// Logger dengan level minimal untuk produksi
const logger = pino({ 
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        target: 'pino-pretty',
        options: { colorize: true }
    }
}).child({ module: 'bot' });

// Separate Baileys logger — keep at 'error' to suppress noisy
// internal Signal-protocol messages (e.g. "Closing open session
// in favor of incoming prekey bundle") that are harmless.
const baileysLogger = pino({ level: 'error' });

// State untuk tracking koneksi
let sock = null;
let isConnecting = false;
let reconnectAttempts = 0;

// Store pending YouTube downloads
const pendingYoutubeDownloads = new Map();
let pairingCodeRequested = false;
let pairingCodeTimeout = null; // Auto-retry timer for expired pairing codes
let isAuthenticated = false; // Track if we have valid auth
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_INTERVAL = 5000; // 5 detik

// Message deduplication - prevent processing same message twice
const processedMessages = new Map();
const MESSAGE_CACHE_TTL = 120000; // Keep message IDs for 2 minutes (increased)
const MESSAGE_CACHE_CLEANUP_INTERVAL = 60000; // Cleanup every 60 seconds

// Additional dedup by content hash (for messages with same content sent rapidly)
const recentMessageHashes = new Map();
const HASH_CACHE_TTL = 5000; // 5 seconds for content-based dedup

// Cleanup old processed messages periodically
setInterval(() => {
    const now = Date.now();
    for (const [msgId, timestamp] of processedMessages) {
        if (now - timestamp > MESSAGE_CACHE_TTL) {
            processedMessages.delete(msgId);
        }
    }
    // Also cleanup content hashes
    for (const [hash, timestamp] of recentMessageHashes) {
        if (now - timestamp > HASH_CACHE_TTL) {
            recentMessageHashes.delete(hash);
        }
    }
}, MESSAGE_CACHE_CLEANUP_INTERVAL);

/**
 * Better hash function for content-based deduplication
 * Uses combination of content + timestamp bucketing untuk avoid collision
 */
const generateContentHash = (str) => {
    // Add timestamp bucket (2 second window) to allow same message after short time
    const timeBucket = Math.floor(Date.now() / 2000);
    const hashInput = `${str}:${timeBucket}`;
    return crypto.createHash('md5').update(hashInput).digest('hex').slice(0, 12);
};

/**
 * Send thinking indicator for long operations
 * Returns a function to send progress updates
 */
const createThinkingIndicator = (sock, sender) => {
    let thinkingMsgSent = false;
    let thinkingTimeout = null;
    
    return {
        // Start thinking indicator after delay (only shows if operation takes long)
        startAfterDelay: (delayMs = 3000, message = '💭 *lagi mikir...*') => {
            thinkingTimeout = setTimeout(async () => {
                try {
                    if (!thinkingMsgSent) {
                        await sock.sendMessage(sender, { text: message });
                        thinkingMsgSent = true;
                    }
                } catch (e) {
                    console.error('[Bot] Failed to send thinking indicator:', e.message);
                }
            }, delayMs);
        },
        // Cancel thinking indicator (operation completed quickly)
        cancel: () => {
            if (thinkingTimeout) {
                clearTimeout(thinkingTimeout);
                thinkingTimeout = null;
            }
        },
        // Send immediate update
        sendUpdate: async (message) => {
            try {
                await sock.sendMessage(sender, { text: message });
                thinkingMsgSent = true;
            } catch (e) {
                console.error('[Bot] Failed to send update:', e.message);
            }
        }
    };
};

// Auth method configuration
const AUTH_METHOD = process.env.WA_AUTH_METHOD || 'qr'; // 'qr' atau 'pairing'
const PHONE_NUMBER = process.env.WA_PHONE_NUMBER || '';

// Auth folder - use absolute path for reliability
const AUTH_FOLDER = path.join(process.cwd(), 'auth_info_baileys');

/**
 * Check if auth folder has valid, complete credentials
 * Returns true ONLY if credentials are complete and valid
 */
const hasValidCredentials = () => {
    try {
        const credsPath = path.join(AUTH_FOLDER, 'creds.json');
        if (!fs.existsSync(credsPath)) {
            console.log('[Auth] No creds.json found');
            return false;
        }
        
        const credsContent = fs.readFileSync(credsPath, 'utf8');
        
        // Check if JSON is valid and complete
        try {
            const creds = JSON.parse(credsContent);
            
            // Check for essential credentials
            const hasMe = !!(creds.me && creds.me.id && creds.me.id.includes('@'));
            const isRegistered = creds.registered === true;
            const hasKeys = !!(creds.noiseKey && creds.signedIdentityKey);
            
            console.log(`[Auth] Check - me: ${hasMe}, registered: ${isRegistered}, keys: ${hasKeys}`);
            
            // Must be registered and have complete me.id with @s.whatsapp.net
            return hasMe && isRegistered && hasKeys;
        } catch (parseErr) {
            console.log('[Auth] creds.json corrupt or invalid JSON, will request new auth');
            return false;
        }
    } catch (error) {
        console.log('[Auth] Error checking credentials:', error.message);
        return false;
    }
};

/**
 * Clean up invalid/corrupt auth files.
 * Only called on initial boot — NOT on 515 reconnects where partial
 * auth (me.id + registered=false) is a normal transitional state.
 */
const cleanupInvalidAuth = (force = false) => {
    try {
        const credsPath = path.join(AUTH_FOLDER, 'creds.json');
        if (fs.existsSync(credsPath)) {
            const credsContent = fs.readFileSync(credsPath, 'utf8');
            try {
                const creds = JSON.parse(credsContent);
                
                // Fully registered + has me.id = valid, keep it
                if (creds.me?.id && creds.registered === true) {
                    console.log('[Auth] Valid registered auth found, keeping');
                    return false;
                }
                
                // Partial auth: me.id exists but NOT registered
                if (creds.me?.id && creds.registered !== true) {
                    if (force) {
                        console.log('[Auth] Force-wiping partial auth (me.id exists, registered=false)');
                        fs.unlinkSync(credsPath);
                        return true;
                    }
                    // Keep it — could be mid-pairing (515 reconnect will complete it)
                    console.log('[Auth] Partial auth found (me.id exists, registered=false), keeping for pairing completion');
                    return false;
                }
                
                // No me.id at all — never paired
                if (!creds.me?.id) {
                    console.log('[Auth] No pairing found (no me.id), cleaning up for fresh start');
                    fs.unlinkSync(credsPath);
                    return true;
                }
            } catch (e) {
                // Invalid JSON, remove it
                console.log('[Auth] Removing corrupt auth file');
                fs.unlinkSync(credsPath);
                return true;
            }
        }
    } catch (error) {
        console.log('[Auth] Error cleaning auth:', error.message);
    }
    return false;
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
        scheduleRetentionCleanup();
        
        // Ensure auth folder exists
        if (!fs.existsSync(AUTH_FOLDER)) {
            fs.mkdirSync(AUTH_FOLDER, { recursive: true });
        }
        
        // Cleanup invalid/corrupt auth before loading
        cleanupInvalidAuth();
        
        // Load auth state dari folder
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
        
        // Check if we have valid existing auth
        const hasExistingAuth = hasValidCredentials();
        console.log(`[Bot] Existing valid auth: ${hasExistingAuth ? 'YES ✅' : 'NO ❌'}`);
        
        // Fetch versi Baileys terbaru
        const { version } = await fetchLatestBaileysVersion();
        console.log(`[Bot] Using Baileys version: ${version.join('.')}`);
        console.log(`[Bot] Auth method: ${AUTH_METHOD.toUpperCase()}`);

        // Buat socket connection
        sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, baileysLogger)
            },
            browser: Browsers.ubuntu('Chrome'),
            printQRInTerminal: false,
            logger: baileysLogger,
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

    // Check if we already have FULLY VALID credentials (me + registered + keys).
    // Also accept partial auth (me.id exists) — the 515 reconnect will complete it.
    const hasExistingAuth = hasValidCredentials() || !!(state.creds?.me?.id);
    
    // Handle pairing code method - ONLY if no existing auth
    if (AUTH_METHOD === 'pairing' && !hasExistingAuth && !pairingCodeRequested && !isAuthenticated) {
        if (PHONE_NUMBER) {
            pairingCodeRequested = true;
            const cleanNumber = PHONE_NUMBER.replace(/[^0-9]/g, '');
            console.log('[Bot] No existing auth found, requesting pairing code untuk nomor:', cleanNumber);
            
            setTimeout(async () => {
                try {
                    const code = await sock.requestPairingCode(cleanNumber);
                    console.log('╔═══════════════════════════════════════════════════════════╗');
                    console.log('║              📱 PAIRING CODE (Masukkan di WA)             ║');
                    console.log('╠═══════════════════════════════════════════════════════════╣');
                    console.log(`║                        ${code}                        ║`);
                    console.log('╠═══════════════════════════════════════════════════════════╣');
                    console.log('║  Buka WhatsApp > Linked Devices > Link a Device           ║');
                    console.log('║  Pilih "Link with phone number instead"                   ║');
                    console.log('║  Masukkan code di atas                                    ║');
                    console.log('║  ⏱️  Code expires in 60s — will auto-refresh              ║');
                    console.log('╚═══════════════════════════════════════════════════════════╝');
                    
                    // Auto-retry if code isn't used within 60 seconds
                    if (pairingCodeTimeout) clearTimeout(pairingCodeTimeout);
                    pairingCodeTimeout = setTimeout(() => {
                        if (!isAuthenticated) {
                            console.log('[Bot] Pairing code expired, requesting fresh code...');
                            pairingCodeRequested = false;
                            // Wipe partial auth and reconnect
                            const credsPath = path.join(AUTH_FOLDER, 'creds.json');
                            if (fs.existsSync(credsPath)) fs.unlinkSync(credsPath);
                            connectToWhatsApp();
                        }
                    }, 60000);
                } catch (err) {
                    console.error('[Bot] Error requesting pairing code:', err.message);
                    pairingCodeRequested = false;
                }
            }, 5000);
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

        // Status 515 = Stream restart required (NORMAL after pairing)
        // The auth is in a transitional state (me.id set, registered=false).
        // Do NOT wipe it — the reconnect will complete registration.
        if (statusCode === 515) {
            console.log('[Bot] Stream restart required (515) - normal after pairing, reconnecting WITHOUT cleanup...');
            isConnecting = false; // allow reconnect
            setTimeout(() => {
                connectToWhatsApp();
            }, 3000);
            return;
        }

        if (shouldReconnect) {
            console.log('[Bot] Bukan logout, attempting reconnect...');
            scheduleReconnect();
        } else {
            // Status 401 = logged out, need to re-authenticate
            console.log('[Bot] Logged out dari WA (401), cleaning up auth and requesting new pairing...');
            isAuthenticated = false;
            reconnectAttempts = 0;
            pairingCodeRequested = false;
            
            // Auto cleanup and reconnect with new pairing
            try {
                // Delete entire auth folder
                if (fs.existsSync(AUTH_FOLDER)) {
                    fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
                    console.log('[Bot] Auth folder cleaned up');
                }
                
                // Wait a bit then reconnect to get new pairing code
                setTimeout(() => {
                    console.log('[Bot] Requesting new authentication...');
                    connectToWhatsApp();
                }, 3000);
            } catch (err) {
                console.error('[Bot] Error cleaning up auth:', err.message);
            }
        }
    }

    if (connection === 'open') {
        isConnecting = false;
        isAuthenticated = true;
        reconnectAttempts = 0;
        pairingCodeRequested = false; // Reset for future reconnects
        if (pairingCodeTimeout) { clearTimeout(pairingCodeTimeout); pairingCodeTimeout = null; }
        
        // Log connected user info
        const me = state.creds?.me || sock.user;
        if (me) {
            console.log('╔═══════════════════════════════════════════════════════════╗');
            console.log('║        ✅ WHATSAPP CONNECTED SUCCESSFULLY!               ║');
            console.log('╠═══════════════════════════════════════════════════════════╣');
            console.log(`║  📱 Account: ${me.id?.split('@')[0] || me.id || 'Unknown'}       `);
            console.log(`║  🤖 Bot: Tama v2.6.0                                      ║`);
            console.log(`║  💾 Auth saved to: ${AUTH_FOLDER}                  ║`);
            console.log('╚═══════════════════════════════════════════════════════════╝');
        } else {
            console.log('[Bot] ✅ Connected to WhatsApp successfully! Siap nerima pesan jir 🚀');
        }
        
        // Initialize auto backup scheduler
        try {
            scheduleBackup(sock);
            console.log('[Bot] ✅ Auto backup scheduled (daily at 00:00 WIB)');
        } catch (backupErr) {
            console.error('[Bot] Failed to schedule backup:', backupErr.message);
        }

        // ═══════════════════════════════════════════════════════════
        // STARTUP CAPABILITY REPORT — run preflight checks
        // ═══════════════════════════════════════════════════════════
        try {
            const deps = await checkDependencies();
            console.log('╔═══════════════════════════════════════════════════════════╗');
            console.log('║             🩺  CAPABILITY REPORT                         ║');
            console.log('╠═══════════════════════════════════════════════════════════╣');
            console.log(`║  yt-dlp  : ${deps.ytDlp ? '✅ installed' : '❌ NOT FOUND'}                          ║`);
            console.log(`║  ffmpeg  : ${deps.ffmpeg ? '✅ installed' : '❌ NOT FOUND'}                          ║`);
            console.log(`║  YouTube : ${deps.ready ? '✅ ready' : '⚠️  disabled'}                              ║`);
            console.log('╚═══════════════════════════════════════════════════════════╝');
        } catch (e) {
            console.error('[Bot] Capability check error:', e.message);
        }
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

    // ═══════════════════════════════════════════════════════════
    // NORMALIZE MESSAGE - Unwrap nested message types
    // Baileys wraps some messages (documentWithCaption, viewOnce, ephemeral)
    // ═══════════════════════════════════════════════════════════
    if (msg.message) {
        // Unwrap viewOnceMessage / viewOnceMessageV2
        if (msg.message.viewOnceMessage) {
            msg.message = msg.message.viewOnceMessage.message || msg.message;
        }
        if (msg.message.viewOnceMessageV2) {
            msg.message = msg.message.viewOnceMessageV2.message || msg.message;
        }
        // Unwrap ephemeralMessage (disappearing messages)
        if (msg.message.ephemeralMessage) {
            msg.message = msg.message.ephemeralMessage.message || msg.message;
        }
        // Unwrap documentWithCaptionMessage (document sent with caption text)
        if (msg.message.documentWithCaptionMessage) {
            msg.message = msg.message.documentWithCaptionMessage.message || msg.message;
        }
    }

    const sender = msg.key.remoteJid;
    const pushName = msg.pushName || 'Bro';
    const messageId = msg.key.id;

    // DEDUPLICATION 1: Skip if we already processed this exact message ID
    if (processedMessages.has(messageId)) {
        console.log(`[Bot] Skipping duplicate message ID: ${messageId}`);
        return;
    }
    
    // DEDUPLICATION 2: Skip if EXACT same content from same sender in last 2 seconds
    // This catches Baileys double-firing the same message
    // Note: Uses timestamp bucketing so user can send same message again after 2s
    const msgTextContent = msg.message?.conversation || 
                       msg.message?.extendedTextMessage?.text || 
                       msg.message?.imageMessage?.caption ||
                       msg.message?.documentMessage?.fileName || '';
    
    // Only dedup if there's actual text content
    if (msgTextContent && msgTextContent.length > 0) {
        const contentHash = generateContentHash(`${sender}:${msgTextContent}`);
        
        if (recentMessageHashes.has(contentHash)) {
            console.log(`[Bot] Skipping duplicate content (within 2s window): ${msgTextContent.slice(0, 30)}...`);
            return;
        }
        
        // Mark this content as seen
        recentMessageHashes.set(contentHash, Date.now());
    }
    
    // Mark message ID as processed
    processedMessages.set(messageId, Date.now());

    // Extract quoted message info (for reply detection)
    // Support contextInfo from ALL message types (text, image, document, video, etc.)
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo ||
                       msg.message?.imageMessage?.contextInfo ||
                       msg.message?.documentMessage?.contextInfo ||
                       msg.message?.videoMessage?.contextInfo ||
                       msg.message?.audioMessage?.contextInfo ||
                       msg.message?.stickerMessage?.contextInfo;

    const quotedMsg = contextInfo?.quotedMessage;
    const quotedMessageId = contextInfo?.stanzaId;
    const quotedParticipant = contextInfo?.participant;
    let quotedContent = null;
    let quotedMediaType = null;
    let quotedMediaInfo = null;

    if (quotedMsg) {
        // Detect media type in quoted message
        if (quotedMsg.imageMessage) {
            quotedMediaType = 'image';
            quotedMediaInfo = {
                mimetype: quotedMsg.imageMessage.mimetype || 'image/jpeg',
                caption: quotedMsg.imageMessage.caption || '',
                fileLength: quotedMsg.imageMessage.fileLength
            };
            quotedContent = quotedMsg.imageMessage.caption || '[gambar]';
        } else if (quotedMsg.documentMessage) {
            quotedMediaType = 'document';
            quotedMediaInfo = {
                mimetype: quotedMsg.documentMessage.mimetype || 'application/octet-stream',
                fileName: quotedMsg.documentMessage.fileName || 'unknown',
                caption: quotedMsg.documentMessage.caption || '',
                fileLength: quotedMsg.documentMessage.fileLength
            };
            quotedContent = `[dokumen: ${quotedMediaInfo.fileName}]`;
        } else if (quotedMsg.videoMessage) {
            quotedMediaType = 'video';
            quotedMediaInfo = {
                mimetype: quotedMsg.videoMessage.mimetype || 'video/mp4',
                caption: quotedMsg.videoMessage.caption || '',
                fileLength: quotedMsg.videoMessage.fileLength
            };
            quotedContent = quotedMsg.videoMessage.caption || '[video]';
        } else if (quotedMsg.audioMessage) {
            quotedMediaType = 'audio';
            quotedMediaInfo = {
                mimetype: quotedMsg.audioMessage.mimetype || 'audio/ogg',
                seconds: quotedMsg.audioMessage.seconds,
                ptt: quotedMsg.audioMessage.ptt
            };
            quotedContent = '[voice note / audio]';
        } else if (quotedMsg.stickerMessage) {
            quotedMediaType = 'sticker';
            quotedContent = '[sticker]';
        } else {
            // Text-only quoted message
            quotedContent = quotedMsg.conversation ||
                           quotedMsg.extendedTextMessage?.text ||
                           '[media]';
        }
        console.log(`[Bot] User is replying to: ${quotedMediaType ? `[${quotedMediaType}] ` : ''}${(quotedContent || '').slice(0, 50)}...`);
    }

    // Check for location message from user
    const locationMsg = msg.message?.locationMessage;
    if (locationMsg) {
        await handleUserLocation(msg, sender, pushName, locationMsg);
        return;
    }

    // ═══════════════════════════════════════════════════════════
    // VOICE NOTE HANDLER - Speech to Text
    // ═══════════════════════════════════════════════════════════
    if (isVoiceNote(msg) || isAudioMessage(msg)) {
        await handleVoiceMessage(msg, sender, pushName, messageId);
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

    // ═══════════════════════════════════════════════════════════
    // REPLY-TO-MEDIA HANDLER
    // User replies to a previously sent media (image/document/video/audio)
    // with a text prompt like "analisa ini", "rangkum", etc.
    // ═══════════════════════════════════════════════════════════
    if (quotedMsg && quotedMediaType && quotedMediaType !== 'sticker') {
        const handled = await handleQuotedMediaReply(msg, sender, pushName, messageId, textContent, quotedMsg, quotedMediaType, quotedMediaInfo, quotedMessageId);
        if (handled) return;
    }

    console.log(`[Bot] Pesan dari ${pushName} (${sender}): ${textContent}`);

    // Check for button/list response (for YouTube format selection)
    const buttonResponse = msg.message?.buttonsResponseMessage?.selectedButtonId ||
                          msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId;
    if (buttonResponse) {
        const ytFormat = parseFormatResponse(buttonResponse);
        if (ytFormat) {
            await handleYoutubeDownload(msg, sender, ytFormat.videoId, ytFormat.format);
            return;
        }
    }

    // Check for YouTube URL
    const youtubeInfo = detectYoutubeUrl(textContent);
    if (youtubeInfo) {
        await handleYoutubeUrl(msg, sender, youtubeInfo);
        return;
    }

    // Check for YouTube download format response (mp3/mp4)
    const lowerText = textContent.toLowerCase().trim();
    if ((lowerText === 'mp3' || lowerText === 'mp4') && pendingYoutubeDownloads.size > 0) {
        // Get the most recent pending download for this user
        const pendingEntries = Array.from(pendingYoutubeDownloads.entries());
        if (pendingEntries.length > 0) {
            const [videoId, info] = pendingEntries[pendingEntries.length - 1];
            // Check if not too old (5 minutes)
            if (Date.now() - info.timestamp < 5 * 60 * 1000) {
                await handleYoutubeDownload(msg, sender, videoId, lowerText);
                return;
            }
        }
    }

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

    // Check for mood reading request FIRST (higher priority than calendar)
    // Because messages like "hari ini w ngerasa berat" should trigger mood, not calendar
    if (isMoodRequest(textContent)) {
        await handleMoodRequest(msg, sender, textContent);
        return;
    }

    // Check for tarot request
    if (isTarotRequest(textContent)) {
        await handleTarotRequest(msg, sender, textContent);
        return;
    }

    // Check for calendar-related queries (natural language)
    // This is checked AFTER mood/tarot to avoid false positives
    // Response diproses AI untuk natural formatting
    const calendarIntent = detectCalendarIntent(textContent);
    if (calendarIntent) {
        let calendarData = null;
        
        // Check if user provided date info in the message
        const parsedDate = parseDateFromString(textContent);
        
        if (calendarIntent.intent === 'zodiac' && parsedDate) {
            calendarData = formatCalendarResponse('zodiac', { 
                month: parsedDate.month, 
                day: parsedDate.day 
            });
        } else if (calendarIntent.intent === 'birthday' && parsedDate && parsedDate.year) {
            calendarData = formatCalendarResponse('birthday', {
                year: parsedDate.year,
                month: parsedDate.month,
                day: parsedDate.day
            });
        } else if (calendarIntent.intent === 'calendar') {
            calendarData = formatCalendarResponse('calendar', { month: calendarIntent.month });
        } else {
            calendarData = formatCalendarResponse(calendarIntent.intent);
        }
        
        if (calendarData) {
            // Save user message
            saveMessage({
                chatId: sender,
                senderJid: sender,
                senderName: pushName,
                role: 'user',
                content: textContent,
                messageId: messageId
            });
            
            await sock.sendPresenceUpdate('composing', sender);
            
            // Get context for AI
            const senderPhone = sender.split('@')[0];
            const senderIsOwner = isOwner(sender);
            const preferredName = getPreferredName(sender, pushName);
            const history = getConversationHistory(sender);
            
            // Let AI format the response naturally
            const aiResponse = await fetchCopilotResponse(
                `User bertanya: "${textContent}"\n\nData kalender:\n${calendarData}\n\nSampaikan info ini dengan natural dan helpful, sesuai gaya lo.`,
                history,
                { isOwner: senderIsOwner, preferredName, senderPhone, pushName, userContextHint: classifyUser(senderPhone, pushName).contextHint }
            );
            
            saveMessage({
                chatId: sender,
                senderJid: 'bot',
                senderName: 'Tama',
                role: 'assistant',
                content: aiResponse,
                messageId: `bot_${Date.now()}`
            });
            
            await smartSend(sock, sender, aiResponse, { quoted: msg });
            await sock.sendPresenceUpdate('paused', sender);
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
    
    // Get sender phone and classify user (owner / salsa / normal)
    const senderPhone = sender.split('@')[0];
    const senderIsOwner = isOwner(sender);
    const userProfile = classifyUser(senderPhone, pushName);
    
    // Check for nickname preference in message
    const detectedNickname = detectNicknamePreference(sender, textContent);
    if (detectedNickname) {
        console.log(`[Bot] Detected nickname preference: "${detectedNickname}" for ${sender}`);
    }
    
    // Get user's preferred name
    const preferredName = getPreferredName(sender, pushName);

    try {
        // ═══════════════════════════════════════════════════════════
        // TEMPORAL LOGIC CHECK: "Dimensi Lain" (3-7 Feb 2026)
        // Jika user tanya tentang author/owner dalam periode ini,
        // bypass AI dan kirim respons hardcoded
        // SKIP if sender is owner!
        // ═══════════════════════════════════════════════════════════
        const dimensiLainResponse = checkDimensiLainLogic(textContent, senderPhone);
        if (dimensiLainResponse) {
            console.log(`[Bot] Temporal response (Dimensi Lain) untuk ${pushName}`);
            
            saveMessage({
                chatId: sender,
                senderJid: 'bot',
                senderName: 'Tama',
                role: 'assistant',
                content: dimensiLainResponse,
                messageId: `bot_${Date.now()}`
            });
            
            await smartSend(sock, sender, dimensiLainResponse, { quoted: msg });
            await sock.sendPresenceUpdate('paused', sender);
            return;
        }

        // ═══════════════════════════════════════════════════════════
        // WEATHER CHECK: BMKG weather & earthquake for Indonesia
        // Real-time cuaca dari BMKG Indonesia - 100% accurate official data
        // Response diproses AI untuk natural formatting
        // ═══════════════════════════════════════════════════════════
        const weatherQuery = detectWeatherQuery(textContent);
        if (weatherQuery) {
            console.log(`[Bot] Weather/earthquake request detected:`, weatherQuery);
            
            await sock.sendMessage(sender, {
                text: weatherQuery.type === 'earthquake' ? '🔴 bentar ya, w cek info gempa dari BMKG...' : '🌤️ bentar ya, w cek cuaca dari BMKG...'
            });
            
            const weatherResponse = await processWeatherRequest(weatherQuery);
            
            if (weatherResponse) {
                // Get AI to format the response naturally
                const history = getConversationHistory(sender);
                const weatherContext = `User bertanya: "${textContent}"\n\nData cuaca/gempa dari BMKG:\n${weatherResponse}`;
                
                const aiResponse = await fetchCopilotResponse(
                    `Berdasarkan data BMKG ini, kasih info cuaca/gempa ke user dengan natural dan informatif. Data sudah akurat, tinggal sampaikan dengan gaya lo:\n\n${weatherContext}`,
                    history,
                    { isOwner: senderIsOwner, preferredName, senderPhone, pushName, userContextHint: classifyUser(senderPhone, pushName).contextHint }
                );
                
                saveMessage({
                    chatId: sender,
                    senderJid: 'bot',
                    senderName: 'Tama',
                    role: 'assistant',
                    content: aiResponse,
                    messageId: `bot_${Date.now()}`
                });
                
                await smartSend(sock, sender, aiResponse, { quoted: msg });
                await sock.sendPresenceUpdate('paused', sender);
                return;
            }
        }

        // ═══════════════════════════════════════════════════════════
        // WEB SEARCH CHECK: DuckDuckGo search for real-time info
        // Detect search requests like "cari di internet", "search", etc.
        // ═══════════════════════════════════════════════════════════
        const searchRequest = detectSearchRequest(textContent);
        if (searchRequest && searchRequest.isSearch) {
            console.log(`[Bot] Web search request detected: "${searchRequest.query}"`);
            
            await sock.sendMessage(sender, {
                text: '🔍 bentar ya w cariin dulu di internet...'
            });
            
            const searchResult = await webSearch(searchRequest.query);
            
            if (searchResult && searchResult.success && searchResult.hasContent) {
                // Format search results
                const formattedResults = formatSearchResult(searchResult);
                
                // Get AI summary of search results
                const history = getConversationHistory(sender);
                const searchContext = `User mencari info tentang: "${searchRequest.query}"\n\nHasil pencarian:\n${formattedResults || 'Tidak ada hasil yang relevan'}`;
                
                const aiResponse = await fetchCopilotResponse(
                    `berdasarkan hasil pencarian ini, kasih rangkuman yang informatif dan helpful untuk user:\n\n${searchContext}`,
                    history,
                    { searchResults: searchResult, isOwner: senderIsOwner, preferredName, senderPhone, pushName, userContextHint: userProfile.contextHint }
                );
                
                saveMessage({
                    chatId: sender,
                    senderJid: 'bot',
                    senderName: 'Tama',
                    role: 'assistant',
                    content: aiResponse,
                    messageId: `bot_${Date.now()}`
                });
                
                await smartSend(sock, sender, aiResponse, { quoted: msg });
                await sock.sendPresenceUpdate('paused', sender);
                return;
            } else {
                // No results, tell user - use preferred name
                await sock.sendMessage(sender, {
                    text: `ga nemu apa2 ${preferredName} soal "${searchRequest.query}" 😅 coba kata kunci lain deh`
                }, { quoted: msg });
                await sock.sendPresenceUpdate('paused', sender);
                return;
            }
        }

        // Get conversation history from database
        const history = getConversationHistory(sender);
        
        // Create thinking indicator for long operations
        const thinking = createThinkingIndicator(sock, sender);
        
        // Start thinking indicator if response takes > 5 seconds
        thinking.startAfterDelay(5000, '💭 *bntar ya w lagi mikir...*');
        
        // Fetch AI response with context including owner status and preferred name
        // Also pass file request hint so AI knows to add [FILE:] marker if needed
        const fileReq = detectFileRequest(textContent);
        let aiPrompt = textContent;
        if (fileReq.isFileRequest && fileReq.format) {
            aiPrompt = `${textContent}\n\n[SYSTEM HINT: User meminta output dalam bentuk file .${fileReq.format}. Tambahkan [FILE:namafile.${fileReq.format}] di awal response dan isi konten file setelahnya. JANGAN gunakan code block/backtick.]`;
        }

        let aiResponse = await fetchCopilotResponse(aiPrompt, history, {
            quotedContent: quotedContent,
            isOwner: senderIsOwner,
            preferredName: preferredName,
            senderPhone: senderPhone,
            pushName: pushName,
            userContextHint: userProfile.contextHint
        });

        // ═══════════════════════════════════════════════════════════
        // WEBSEARCH MARKER: If AI needs real-time info, it outputs
        // [WEBSEARCH:query] - we search, then call AI again with results
        // ═══════════════════════════════════════════════════════════
        const searchMarker = parseWebSearchMarker(aiResponse);
        if (searchMarker && searchMarker.needsSearch) {
            console.log(`[Bot] AI requested web search: "${searchMarker.query}"`);
            
            // Notify user
            await sock.sendMessage(sender, {
                text: '🔍 bntar ya w cari dulu di internet...'
            });

            const searchResult = await webSearch(searchMarker.query);
            
            if (searchResult && searchResult.success && searchResult.hasContent) {
                const formattedResults = formatSearchResult(searchResult);
                
                // Second AI call with search results injected
                aiResponse = await fetchCopilotResponse(
                    `${textContent}\n\n[SEARCH RESULTS untuk "${searchMarker.query}"]\n${formattedResults || 'Tidak ada hasil spesifik'}\n${searchResult.snippets ? searchResult.snippets.join('\n') : ''}\n[END SEARCH RESULTS]\n\nGunakan info di atas untuk menjawab pertanyaan user secara informatif dan akurat. Jangan tambahkan [WEBSEARCH:] lagi.`,
                    history,
                    { quotedContent, isOwner: senderIsOwner, preferredName, senderPhone, pushName, userContextHint: userProfile.contextHint }
                );
            } else {
                // Search failed - call AI again without search
                aiResponse = await fetchCopilotResponse(
                    `${textContent}\n\n[NOTE: Web search untuk "${searchMarker.query}" tidak menemukan hasil. Jawab sebaik mungkin berdasarkan pengetahuan yang kamu punya, dan bilang ke user kalau info mungkin tidak up-to-date. Jangan tambahkan [WEBSEARCH:] lagi.]`,
                    history,
                    { quotedContent, isOwner: senderIsOwner, preferredName, senderPhone, pushName, userContextHint: userProfile.contextHint }
                );
            }
        }

        // Cancel thinking indicator (response received)
        thinking.cancel();

        console.log(`[Bot] Response untuk ${pushName} (owner: ${senderIsOwner}): ${aiResponse.slice(0, 100)}...`);

        // Check if AI response contains a file marker [FILE:filename.ext]
        const fileInfo = parseFileMarker(aiResponse);

        if (fileInfo && fileInfo.hasFile) {
            console.log(`[Bot] File creation detected: ${fileInfo.fileName}`);

            // Send intro text if AI included a greeting before the file marker
            if (fileInfo.preText) {
                await sock.sendMessage(sender, { text: fileInfo.preText }, { quoted: msg });
            }

            // Save AI response to database (full content for context)
            saveMessage({
                chatId: sender,
                senderJid: 'bot',
                senderName: 'Tama',
                role: 'assistant',
                content: `[Sent file: ${fileInfo.fileName}]\n\n${fileInfo.content.slice(0, 500)}...`,
                messageId: `bot_${Date.now()}`
            });

            try {
                // Send the file
                await createAndSendFile(sock, sender, fileInfo.content, fileInfo.fileName, {
                    quoted: fileInfo.preText ? undefined : msg,
                    caption: `📄 *${fileInfo.fileName}*\n\n_tap buat save ke device lu_`
                });

                // Send confirmation text only if there was no preText (avoid redundant messages)
                if (!fileInfo.preText) {
                    await sock.sendMessage(sender, {
                        text: `nih w udah buatin file nya cuy 📁\n*${fileInfo.fileName}*\ntap aja buat download ya`
                    });
                }
            } catch (fileError) {
                console.error('[Bot] Error sending file:', fileError.message);
                // Fallback: send as text
                await smartSend(sock, sender, aiResponse, { quoted: msg });
            }
        } else {
            // Normal text response
            saveMessage({
                chatId: sender,
                senderJid: 'bot',
                senderName: 'Tama',
                role: 'assistant',
                content: aiResponse,
                messageId: `bot_${Date.now()}`
            });

            // Send response (auto-splits long messages)
            await smartSend(sock, sender, aiResponse, { quoted: msg });
        }

    } catch (error) {
        console.error('[Bot] Error getting AI response:', error.message);
        await reportBugToOwner(sock, sender, pushName, error, 'AI Response', msg);
    }

    await sock.sendPresenceUpdate('paused', sender);
};

/**
 * ═══════════════════════════════════════════════════════════
 * Handle Reply-to-Media - User replies to a media message with text
 * Re-downloads the quoted media and processes it with the user's prompt
 * ═══════════════════════════════════════════════════════════
 */
const handleQuotedMediaReply = async (msg, sender, pushName, messageId, textContent, quotedMsg, quotedMediaType, quotedMediaInfo, quotedMessageId) => {
    console.log(`[Bot] Reply-to-media detected: type=${quotedMediaType}, prompt="${textContent.slice(0, 50)}"`);

    const senderPhone = sender.split('@')[0];
    const _userProfile = classifyUser(senderPhone, pushName);

    await sock.sendPresenceUpdate('composing', sender);

    // Save user message
    saveMessage({
        chatId: sender,
        senderJid: sender,
        senderName: pushName,
        role: 'user',
        content: textContent,
        messageId: messageId,
        quotedMessageId: quotedMessageId,
        quotedContent: `[reply to ${quotedMediaType}]`
    });

    try {
        // Construct pseudo-message object for downloading quoted media
        const mediaMsg = {
            key: {
                id: quotedMessageId,
                remoteJid: sender,
                fromMe: msg.message?.extendedTextMessage?.contextInfo?.participant ? false : true
            },
            message: quotedMsg
        };

        let buffer;
        try {
            buffer = await downloadMediaMessage(
                mediaMsg,
                'buffer',
                {},
                { logger: console, reuploadRequest: sock.updateMediaMessage }
            );
        } catch (downloadError) {
            console.error(`[Bot] Failed to download quoted media: ${downloadError.message}`);

            // Fallback: try to use stored context from database
            // First check the original message, then find the bot's analysis response
            const pastMessage = getMessageById(quotedMessageId);
            const botResponse = getBotResponseAfter(sender, quotedMessageId);
            
            // Use the bot's previous analysis if available (much more useful than just "[document]")
            const storedContext = botResponse?.content || pastMessage?.content || null;
            
            if (storedContext) {
                const contextSource = botResponse ? 'previous analysis' : 'stored message';
                console.log(`[Bot] Using ${contextSource} as fallback for expired media (${storedContext.length} chars)`);
                
                const history = getConversationHistory(sender);
                const aiResponse = await fetchCopilotResponse(
                    `User me-reply ke ${quotedMediaType} sebelumnya. Berikut konteks yang tersimpan:\n\n"${storedContext.slice(0, 10000)}"\n\nPermintaan user: ${textContent}\n\nNote: File media sudah expired, tapi konteks di atas adalah ${botResponse ? 'analisis sebelumnya dari file tersebut' : 'info tersimpan'}. Gunakan untuk menjawab sebaik mungkin.`,
                    history,
                    { isOwner: isOwner(sender), preferredName: getPreferredName(sender, pushName), senderPhone, pushName, userContextHint: _userProfile.contextHint }
                );

                saveMessage({
                    chatId: sender,
                    senderJid: 'bot',
                    senderName: 'Tama',
                    role: 'assistant',
                    content: aiResponse,
                    messageId: `bot_${Date.now()}`
                });

                await smartSend(sock, sender, aiResponse, { quoted: msg });
                await sock.sendPresenceUpdate('paused', sender);
                return true;
            }

            await sock.sendMessage(sender, {
                text: 'duh gabisa download ulang media nya bro 😓 kayaknya udah expired. coba kirim ulang file nya ya'
            }, { quoted: msg });
            await sock.sendPresenceUpdate('paused', sender);
            return true;
        }

        console.log(`[Bot] Successfully re-downloaded quoted ${quotedMediaType}: ${buffer.length} bytes`);

        let aiResponse;

        // Route to appropriate handler based on media type
        if (quotedMediaType === 'image') {
            // Image -> Vision API
            await sock.sendMessage(sender, {
                text: '👀 oke w liat lagi gambar nya ya...'
            });

            const history = getConversationHistory(sender);
            const base64 = buffer.toString('base64');
            aiResponse = await fetchVisionResponse(base64, quotedMediaInfo.mimetype, textContent, history);

        } else if (quotedMediaType === 'document') {
            // Document -> Document Handler
            const filename = quotedMediaInfo.fileName || 'unknown';
            const mimetype = quotedMediaInfo.mimetype;

            if (isSupportedDocument(filename, mimetype)) {
                await sock.sendMessage(sender, {
                    text: `📄 oke w baca ulang "${filename}" sesuai permintaan lu ya...`
                });

                const onProgress = async (current, total, message) => {
                    try {
                        await sock.sendMessage(sender, { text: message });
                    } catch (err) {
                        console.error('[Document Progress] Failed to send update:', err.message);
                    }
                };

                const history = getConversationHistory(sender);
                const result = await processDocument(buffer, filename, mimetype, textContent, history, onProgress);

                if (!result.success) {
                    await reportBugToOwner(sock, sender, pushName, result.error || result.analysis, `Quoted Document: ${filename}`, msg);
                }

                aiResponse = result.analysis;
            } else {
                aiResponse = `sori bro, format file "${filename}" belum ke-support buat analisis ulang 😅`;
            }

        } else if (quotedMediaType === 'video') {
            // Video -> acknowledge with context
            await sock.sendMessage(sender, {
                text: '🎬 w liat video nya ya...'
            });

            const history = getConversationHistory(sender);
            aiResponse = await fetchCopilotResponse(
                `User me-reply ke video sebelumnya (${quotedMediaInfo.mimetype}, caption: "${quotedMediaInfo.caption || 'tanpa caption'}").\n\nPermintaan user: ${textContent}\n\nNote: w belum bisa analisis video langsung, tapi kasih respons yang helpful berdasarkan konteks.`,
                history,
                { isOwner: isOwner(sender), preferredName: getPreferredName(sender, pushName), senderPhone, pushName, userContextHint: _userProfile.contextHint }
            );

        } else if (quotedMediaType === 'audio') {
            // Audio -> Transcribe then process
            await sock.sendMessage(sender, {
                text: '🎤 oke w dengerin ulang audio nya...'
            });

            const audioFormat = quotedMediaInfo.mimetype?.includes('ogg') ? 'ogg' :
                               quotedMediaInfo.mimetype?.includes('mpeg') ? 'mp3' : 'ogg';
            const transcription = await transcribeAudio(buffer, audioFormat);

            if (transcription.success) {
                const history = getConversationHistory(sender);
                aiResponse = await fetchCopilotResponse(
                    `User me-reply ke voice note/audio sebelumnya.\nIsi audio (transcription): "${transcription.text}"\n\nPermintaan user: ${textContent}`,
                    history,
                    { isOwner: isOwner(sender), preferredName: getPreferredName(sender, pushName), senderPhone, pushName, userContextHint: _userProfile.contextHint }
                );
            } else {
                aiResponse = 'duh gabisa transcribe ulang audio nya 😓 coba kirim ulang voice note nya ya';
            }
        }

        if (aiResponse) {
            // Check if AI requested a web search
            const searchMarker = parseWebSearchMarker(aiResponse);
            if (searchMarker && searchMarker.needsSearch) {
                console.log(`[Bot] AI requested web search from quoted media: "${searchMarker.query}"`);
                await sock.sendMessage(sender, { text: '🔍 bntar ya w cari dulu di internet...' });
                
                const searchResult = await webSearch(searchMarker.query);
                if (searchResult?.success && searchResult?.hasContent) {
                    const formattedResults = formatSearchResult(searchResult);
                    const history = getConversationHistory(sender);
                    aiResponse = await fetchCopilotResponse(
                        `${textContent}\n\n[SEARCH RESULTS]\n${formattedResults || ''}\n${searchResult.snippets ? searchResult.snippets.join('\n') : ''}\n[END SEARCH RESULTS]\n\nJawab pertanyaan user berdasarkan info di atas. Jangan tambahkan [WEBSEARCH:] lagi.`,
                        history,
                        { isOwner: isOwner(sender), preferredName: getPreferredName(sender, pushName), senderPhone, pushName, userContextHint: _userProfile.contextHint }
                    );
                }
            }

            // Check if AI response contains file marker [FILE:filename.ext]
            const fileInfo = parseFileMarker(aiResponse);

            if (fileInfo && fileInfo.hasFile) {
                console.log(`[Bot] File creation from quoted media: ${fileInfo.fileName}`);

                // Send intro text if AI included a greeting before the file marker
                if (fileInfo.preText) {
                    await sock.sendMessage(sender, { text: fileInfo.preText }, { quoted: msg });
                }

                saveMessage({
                    chatId: sender,
                    senderJid: 'bot',
                    senderName: 'Tama',
                    role: 'assistant',
                    content: `[Sent file: ${fileInfo.fileName}]`,
                    messageId: `bot_${Date.now()}`
                });

                try {
                    await createAndSendFile(sock, sender, fileInfo.content, fileInfo.fileName, {
                        quoted: fileInfo.preText ? undefined : msg,
                        caption: `📄 *${fileInfo.fileName}*\n\n_tap buat save ke device lu_`
                    });

                    if (!fileInfo.preText) {
                        await sock.sendMessage(sender, {
                            text: `nih w udah buatin file nya cuy 📁\n*${fileInfo.fileName}*`
                        });
                    }
                } catch (fileError) {
                    console.error('[Bot] Error sending file from quoted media:', fileError.message);
                    await smartSend(sock, sender, aiResponse, { quoted: msg });
                }
            } else {
                saveMessage({
                    chatId: sender,
                    senderJid: 'bot',
                    senderName: 'Tama',
                    role: 'assistant',
                    content: aiResponse,
                    messageId: `bot_${Date.now()}`
                });

                await smartSend(sock, sender, aiResponse, { quoted: msg });
            }
        }

    } catch (error) {
        console.error('[Bot] Error handling quoted media reply:', error.message);
        await reportBugToOwner(sock, sender, pushName, error, `Quoted Media Reply (${quotedMediaType})`, msg);
    }

    await sock.sendPresenceUpdate('paused', sender);
    return true;
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
            text: `🤖 *Tama AI v2.5*\n\n*Fitur Chat:*\n• Chat biasa - w bales pake gaya Tama\n• Kirim gambar - w analisis/deskripsiin\n• Kirim voice note - w transcribe & jawab\n• Kirim lokasi - w tau dimana lu\n• Reply chat - w paham konteks nya\n• Reply lampiran - w bisa analisis ulang tanpa kirim ulang!\n• 🌐 *Real-time Internet* - w bisa cari info terbaru di internet!\n\n*File Creator:*\n📄 Minta w buatin file:\n• "buatkan laporan dalam format markdown"\n• "bikin file .txt tentang..."\n• "export data ke csv"\n• "buat file html portofolio"\nFile dikirim sebagai attachment, bukan raw text!\n\n*Document Reader (70+ format):*\n📑 Kirim file apa aja - w baca & analisis:\n• PDF, DOCX, TXT, MD, HTML, XML, dll\n• Max file: 100MB (limit WhatsApp)\n• Reply dokumen + text = analisis ulang!\n\n*Media Features:*\n🎨 /sticker - bikin stiker dari gambar/video\n📸 /tebaksuku - tebak suku dari foto\n\n*Entertainment:*\n🔮 /tarot - baca kartu tarot\n🎴 /tarotyn [pertanyaan] - ya/tidak\n😊 /bacamood [curhat] - baca mood lo\n🎵 kirim link youtube - download MP3/MP4\n\n*Utility:*\n🔍 /search [query] - cari di internet\n📅 /kalender - kalender bulan ini\n📆 /libur - libur nasional\n♈ /zodiak [tgl] - cek zodiak\n🎂 /ultah [tgl] - info ulang tahun\n\n*Commands Lain:*\n• /clear - hapus history chat\n• /stats - lihat statistik\n• /help - bantuan ini\n\n💡 Chat aja natural, w ngerti kok bro 😎\n\n*NEW!* 🌐 W bisa akses internet real-time! Tanya aja soal info terbaru, w cariin 🔥`
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

    // Command: /tarot - tarot reading menu
    if (lowerText === '/tarot' || lowerText === '/tarot help') {
        await sock.sendMessage(sender, {
            text: `🔮 *TAROT MENU*\n━━━━━━━━━━━━━━━━━━━━━\n\n📜 *Spread yang tersedia:*\n\n1️⃣ *Satu Kartu*\n   /tarot1 [pertanyaan]\n   Insight cepat untuk pertanyaan\n\n2️⃣ *Tiga Kartu*\n   /tarot3 [pertanyaan]\n   Past - Present - Future\n\n3️⃣ *Love Spread*\n   /tarotlove [pertanyaan]\n   Khusus pertanyaan cinta\n\n4️⃣ *Yes/No*\n   /tarotyn [pertanyaan]\n   Jawaban Ya atau Tidak\n\n5️⃣ *Celtic Cross (10 kartu)*\n   /tarotfull [pertanyaan]\n   Reading lengkap & mendalam\n\n━━━━━━━━━━━━━━━━━━━━━\n💡 Contoh: /tarot1 apakah w bakal sukses?\n\natau langsung aja ketik "tarot" + pertanyaan mu`
        }, { quoted: msg });
        return true;
    }

    // Command: /tarot1 - single card
    if (lowerText.startsWith('/tarot1')) {
        const question = text.slice(7).trim() || 'Insight untuk hari ini';
        await handleTarotRequest(msg, sender, question, 'single');
        return true;
    }

    // Command: /tarot3 - three card spread
    if (lowerText.startsWith('/tarot3')) {
        const question = text.slice(7).trim() || 'Past-Present-Future untuk saya';
        await handleTarotRequest(msg, sender, question, 'threeCard');
        return true;
    }

    // Command: /tarotlove - love spread
    if (lowerText.startsWith('/tarotlove') || lowerText.startsWith('/tarotcinta')) {
        const question = text.slice(10).trim() || 'Bagaimana hubungan cinta saya?';
        await handleTarotRequest(msg, sender, question, 'loveSpread');
        return true;
    }

    // Command: /tarotyn - yes/no
    if (lowerText.startsWith('/tarotyn')) {
        const question = text.slice(8).trim();
        if (!question) {
            await sock.sendMessage(sender, {
                text: 'kasih pertanyaan nya dong bro\ncontoh: /tarotyn apakah dia suka sama w?'
            }, { quoted: msg });
            return true;
        }
        await handleYesNoTarot(msg, sender, question);
        return true;
    }

    // Command: /tarotfull - celtic cross
    if (lowerText.startsWith('/tarotfull')) {
        const question = text.slice(10).trim() || 'Reading lengkap untuk saya';
        await handleTarotRequest(msg, sender, question, 'celticCross');
        return true;
    }

    // Command: /mood - mood reading
    if (lowerText === '/mood' || lowerText === '/mood help') {
        await sock.sendMessage(sender, {
            text: `🔮 *MOOD READING*\n━━━━━━━━━━━━━━━━━━━━━\n\nW bisa baca mood/perasaan lo dari cerita yang lo jabarin.\n\n*Cara pakai:*\n/bacamood [ceritain perasaan lo]\n\natau langsung cerita aja dengan kata "lagi ngerasa..." atau "curhat dong..."\n\n*Contoh:*\n• /bacamood lagi bingung sama kerjaan\n• curhat dong, w lagi sedih karena putus\n• w lagi ngerasa stressed bgt\n\n━━━━━━━━━━━━━━━━━━━━━\n💭 Cerita aja, w dengerin kok bro`
        }, { quoted: msg });
        return true;
    }

    // Command: /bacamood - mood reading
    if (lowerText.startsWith('/bacamood') || lowerText.startsWith('/readmood')) {
        const description = text.slice(9).trim();
        if (!description) {
            await sock.sendMessage(sender, {
                text: 'ceritain dulu perasaan lo gimana bro\ncontoh: /bacamood lagi sedih karena kerjaan ga beres'
            }, { quoted: msg });
            return true;
        }
        await handleMoodRequest(msg, sender, description);
        return true;
    }

    // Command: /search - web search
    if (lowerText.startsWith('/search') || lowerText.startsWith('/cari')) {
        const query = text.replace(/^\/(search|cari)\s*/i, '').trim();
        if (!query) {
            await sock.sendMessage(sender, {
                text: 'kasih keyword nya dong bro\ncontoh: /search cara masak nasi goreng'
            }, { quoted: msg });
            return true;
        }
        
        await sock.sendMessage(sender, {
            text: '🔍 bentar ya w cariin dulu...'
        });
        
        const searchResult = await webSearch(query);
        
        if (searchResult && searchResult.success && searchResult.hasContent) {
            const formattedResults = formatSearchResult(searchResult);
            const history = getConversationHistory(sender);
            
            const aiResponse = await fetchCopilotResponse(
                `berdasarkan hasil pencarian ini, kasih rangkuman yang informatif:\n\nQuery: "${query}"\n\nHasil:\n${formattedResults || 'Tidak ada hasil'}`,
                history,
                { searchResults: searchResult, pushName: null, userContextHint: classifyUser(sender.split('@')[0], null).contextHint }
            );
            
            await smartSend(sock, sender, aiResponse, { quoted: msg });
        } else {
            await sock.sendMessage(sender, {
                text: `ga nemu apa2 soal "${query}" 😅 coba kata kunci lain`
            }, { quoted: msg });
        }
        return true;
    }

    // Command: /backup - manual backup (admin only)
    if (lowerText === '/backup') {
        const OWNER_NUMBER = process.env.OWNER_NUMBER || '6281234567890';
        const senderNumber = sender.split('@')[0];
        
        if (senderNumber === OWNER_NUMBER) {
            await sock.sendMessage(sender, {
                text: '📦 oke bentar ya w backup session sekarang...'
            });
            
            try {
                await runBackupNow(sock);
                await sock.sendMessage(sender, {
                    text: '✅ backup berhasil! file nya udah w kirim'
                });
            } catch (err) {
                await sock.sendMessage(sender, {
                    text: `❌ gagal backup: ${err.message}`
                }, { quoted: msg });
            }
        } else {
            await sock.sendMessage(sender, {
                text: 'sori bro, command ini cuma buat owner 😅'
            }, { quoted: msg });
        }
        return true;
    }

    // Command: /sticker - help for sticker
    if (lowerText === '/sticker' || lowerText === '/stiker') {
        await sock.sendMessage(sender, {
            text: `🎨 *STICKER MAKER*\n━━━━━━━━━━━━━━━━━━━━━\n\nKirim gambar/video dengan caption:\n• "sticker"\n• "stiker"\n• "jadiin sticker"\n• "bikin stiker"\n\n*Contoh:*\nKirim gambar + caption "sticker"\n\n*Supported:*\n📷 Image (JPG, PNG, WEBP)\n🎬 Video (max 10 detik, jadi animated)\n\n━━━━━━━━━━━━━━━━━━━━━\n💡 Kirim media aja + caption "sticker"`
        }, { quoted: msg });
        return true;
    }


    return false;;
};

/**
 * ═══════════════════════════════════════════════════════════
 * Handle Voice Note / Audio messages (Speech-to-Text)
 * ═══════════════════════════════════════════════════════════
 */
const handleVoiceMessage = async (msg, sender, pushName, messageId) => {
    console.log(`[Bot] Voice message dari ${pushName}`);
    
    const _senderPhone = sender.split('@')[0];
    const _userProfile = classifyUser(_senderPhone, pushName);

    await sock.sendPresenceUpdate('composing', sender);
    
    try {
        // Download audio
        const audioBuffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            { logger: console, reuploadRequest: sock.updateMediaMessage }
        );
        
        const audioFormat = getAudioFormat(msg);
        console.log(`[Bot] Processing voice note, format: ${audioFormat}`);
        
        // Send "processing" message
        await sock.sendMessage(sender, {
            text: '🎤 bentar ya w dengerin dulu voice nya...'
        });
        
        // Transcribe audio
        const transcription = await transcribeAudio(audioBuffer, audioFormat);
        
        if (!transcription.success) {
            await sock.sendMessage(sender, {
                text: 'duh gabisa denger voice nya bro 😓 coba ketik aja ya'
            }, { quoted: msg });
            return;
        }
        
        const transcribedText = transcription.text;
        console.log(`[Bot] Transcribed: "${transcribedText.substring(0, 50)}..."`);
        
        // Save transcription to database
        saveMessage({
            chatId: sender,
            senderJid: sender,
            senderName: pushName,
            role: 'user',
            content: `[Voice Note] ${transcribedText}`,
            messageId: messageId
        });
        
        // Send transcription confirmation
        await sock.sendMessage(sender, {
            text: `📝 *w denger:* "${transcribedText}"\n\n_bentar ya w respon..._`
        });
        
        // Get AI response for the transcribed text
        const history = getConversationHistory(sender);
        const aiResponse = await fetchCopilotResponse(transcribedText, history, {
            pushName,
            userContextHint: _userProfile.contextHint
        });
        
        // Save response
        saveMessage({
            chatId: sender,
            senderJid: 'bot',
            senderName: 'Tama',
            role: 'assistant',
            content: aiResponse,
            messageId: `bot_${Date.now()}`
        });
        
        // Send response
        await smartSend(sock, sender, aiResponse, { quoted: msg });
        
    } catch (error) {
        console.error('[Bot] Error processing voice:', error.message);
        await reportBugToOwner(sock, sender, pushName, error, 'Voice Processing', msg);
    }
    
    await sock.sendPresenceUpdate('paused', sender);
};

/**
 * Handle media messages (images, documents, etc)
 */
const handleMediaMessage = async (msg, sender, pushName, quotedContent, messageId) => {
    const mediaType = getMediaType(msg);
    const caption = getMediaCaption(msg);
    
    const _senderPhone = sender.split('@')[0];
    const _userProfile = classifyUser(_senderPhone, pushName);

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
        
        const filename = msg.message?.documentMessage?.fileName || 'unknown';

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

        // Check if user wants to make sticker
        const lowerCaption = (caption || '').toLowerCase();
        if ((mediaType === 'image' || mediaType === 'video') && isStickerRequest(caption)) {
            console.log(`[Bot] Creating sticker from ${mediaType}`);
            try {
                let stickerBuffer;
                if (mediaType === 'image') {
                    stickerBuffer = await imageToSticker(buffer, mimetype);
                } else {
                    stickerBuffer = await videoToSticker(buffer, mimetype);
                }
                
                await sendSticker(sock, sender, stickerBuffer, { quoted: msg });
                
                saveMessage({
                    chatId: sender,
                    senderJid: 'bot',
                    senderName: 'Tama',
                    role: 'assistant',
                    content: '[Sent Sticker]',
                    messageId: `bot_${Date.now()}`
                });
                
                await sock.sendPresenceUpdate('paused', sender);
                return;
            } catch (stickerError) {
                console.error('[Bot] Sticker creation error:', stickerError.message);
                await reportBugToOwner(sock, sender, pushName, stickerError, 'Sticker Creation', msg);
                await sock.sendPresenceUpdate('paused', sender);
                return;
            }
        }
        // Check if user wants ethnicity detection
        else if (mediaType === 'image' && (lowerCaption.includes('tebak suku') || lowerCaption.includes('suku apa'))) {
            aiResponse = await detectEthnicity(buffer, mimetype);
        }
        // Handle image with vision
        else if (mediaType === 'image') {
            const history = getConversationHistory(sender);
            const base64 = buffer.toString('base64');
            aiResponse = await fetchVisionResponse(base64, mimetype, caption, history);
        }
        // Handle PDF/DOCX documents with AI analysis
        else if (mediaType === 'document' && isSupportedDocument(filename, mimetype)) {
            console.log(`[Bot] Processing document: ${filename}`);
            
            // Send initial progress indicator
            await sock.sendMessage(sender, {
                text: `📄 *Analyzing document...*\n\nwet bntar ya w baca file "${filename}" dulu 📖\n_ini mungkin butuh waktu sebentar..._`
            });
            
            // Create progress callback to send updates to user
            const onProgress = async (current, total, message) => {
                try {
                    await sock.sendMessage(sender, { text: message });
                    console.log(`[Document Progress] ${current}/${total} - sent to ${sender}`);
                } catch (err) {
                    console.error('[Document Progress] Failed to send update:', err.message);
                }
            };
            
            const history = getConversationHistory(sender);
            const result = await processDocument(buffer, filename, mimetype, caption, history, onProgress);
            
            // If document analysis failed, report bug to owner
            if (!result.success) {
                await reportBugToOwner(sock, sender, pushName, result.error || result.analysis, `Document Analysis: ${filename}`, msg);
            }
            
            aiResponse = result.analysis;
        }
        // Handle other documents
        else if (mediaType === 'document') {
            // Send progress indicator
            await sock.sendMessage(sender, {
                text: `📄 *Processing file...*\n\nokei w proses file "${filename}" dulu ya 🔍`
            });
            
            const docInfo = await analyzeDocument(buffer, filename, mimetype);
            
            const history = getConversationHistory(sender);
            aiResponse = await fetchCopilotResponse(
                `User kirim file: ${filename}`,
                history,
                { mediaDescription: docInfo, pushName, userContextHint: _userProfile.contextHint }
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

        // Send response (auto-splits long vision analysis)
        await smartSend(sock, sender, aiResponse, { quoted: msg });

    } catch (error) {
        console.error('[Bot] Error processing media:', error.message);
        await reportBugToOwner(sock, sender, pushName, error, 'Media Processing', msg);
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
        await reportBugToOwner(sock, sender, msg.pushName || 'User', error, 'Location Request', msg);
    }

    await sock.sendPresenceUpdate('paused', sender);
};

/**
 * Handle incoming user location
 */
const handleUserLocation = async (msg, sender, pushName, locationMsg) => {
    console.log(`[Bot] Received location from ${pushName}`);
    console.log(`[Bot] Location data:`, {
        lat: locationMsg.degreesLatitude,
        lon: locationMsg.degreesLongitude,
        name: locationMsg.name,
        address: locationMsg.address
    });

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
        const _locProfile = classifyUser(sender.split('@')[0], pushName);
        const aiResponse = await fetchCopilotResponse(
            `User share lokasi nya di: ${locationInfo.address}`,
            history,
            { pushName, userContextHint: _locProfile.contextHint }
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

        // Send response
        await smartSend(sock, sender, aiResponse, { quoted: msg });

    } catch (error) {
        console.error('[Bot] Error handling location:', error.message);
        await reportBugToOwner(sock, sender, pushName, error, 'User Location', msg);
    }

    await sock.sendPresenceUpdate('paused', sender);
};

/**
 * Handle tarot reading request
 */
const handleTarotRequest = async (msg, sender, text, spreadType = null) => {
    console.log(`[Bot] Tarot request: ${text}`);
    
    await sock.sendPresenceUpdate('composing', sender);

    try {
        // Determine spread type from message if not provided
        const spread = spreadType || getSpreadFromMessage(text);
        
        // Extract question (remove tarot keywords)
        let question = text
            .replace(/tarot|kartu|baca|main|ramal|ramalan/gi, '')
            .trim() || 'Apa pesan untuk saya hari ini?';

        // Get conversation history for context
        const history = getConversationHistory(sender);
        
        // Perform the reading
        const result = await performReading(spread, question, history);
        
        // Check if message needs to be split
        const readingText = result.reading;
        
        if (readingText.length > WA_MESSAGE_LIMIT) {
            // Split and send in chunks
            const chunks = splitMessage(readingText);
            console.log(`[Bot] Tarot reading split into ${chunks.length} messages`);
            
            for (let i = 0; i < chunks.length; i++) {
                let chunkText = chunks[i];
                
                // Add part indicator
                if (chunks.length > 1) {
                    chunkText += `\n\n_[${i + 1}/${chunks.length}]_`;
                }
                
                // Only quote first message
                const msgOptions = i === 0 ? { quoted: msg } : {};
                
                await sock.sendMessage(sender, { text: chunkText }, msgOptions);
                
                // Small delay between messages
                if (i < chunks.length - 1) {
                    await new Promise(r => setTimeout(r, 500));
                    await sock.sendPresenceUpdate('composing', sender);
                }
            }
        } else {
            // Send single message
            await sock.sendMessage(sender, { text: readingText }, { quoted: msg });
        }
        
        // Save to database
        saveMessage({
            chatId: sender,
            senderJid: 'bot',
            senderName: 'Tama',
            role: 'assistant',
            content: readingText,
            messageId: `bot_${Date.now()}`
        });

    } catch (error) {
        console.error('[Bot] Error with tarot reading:', error.message);
        await reportBugToOwner(sock, sender, msg.pushName || 'User', error, 'Tarot Reading', msg);
    }

    await sock.sendPresenceUpdate('paused', sender);
};

/**
 * Handle Yes/No tarot reading
 */
const handleYesNoTarot = async (msg, sender, question) => {
    console.log(`[Bot] Tarot Yes/No: ${question}`);
    
    await sock.sendPresenceUpdate('composing', sender);

    try {
        const result = yesNoReading(question);
        
        await sock.sendMessage(sender, { text: result.text }, { quoted: msg });
        
        // Save to database
        saveMessage({
            chatId: sender,
            senderJid: 'bot',
            senderName: 'Tama',
            role: 'assistant',
            content: result.text,
            messageId: `bot_${Date.now()}`
        });

    } catch (error) {
        console.error('[Bot] Error with yes/no tarot:', error.message);
        await reportBugToOwner(sock, sender, msg.pushName || 'User', error, 'Yes/No Tarot', msg);
    }

    await sock.sendPresenceUpdate('paused', sender);
};

/**
 * Handle mood reading request
 */
const handleMoodRequest = async (msg, sender, description) => {
    console.log(`[Bot] Mood reading request`);
    
    await sock.sendPresenceUpdate('composing', sender);

    try {
        // Get conversation history for better context
        const history = getConversationHistory(sender);
        
        // Analyze mood
        const moodAnalysis = await analyzeMood(description, history);
        
        // Generate response
        const moodResponse = generateMoodResponse(moodAnalysis);
        
        // Use smartSend for long responses
        await smartSend(sock, sender, moodResponse, { quoted: msg });
        
        // Save to database
        saveMessage({
            chatId: sender,
            senderJid: 'bot',
            senderName: 'Tama',
            role: 'assistant',
            content: moodResponse,
            messageId: `bot_${Date.now()}`
        });

    } catch (error) {
        console.error('[Bot] Error with mood reading:', error.message);
        await reportBugToOwner(sock, sender, msg.pushName || 'User', error, 'Mood Reading', msg);
    }

    await sock.sendPresenceUpdate('paused', sender);
};

/**
 * Handle YouTube URL detection
 */
const handleYoutubeUrl = async (msg, sender, youtubeInfo) => {
    console.log(`[Bot] YouTube URL detected: ${youtubeInfo.videoId}`);
    
    await sock.sendPresenceUpdate('composing', sender);

    try {
        // Process the URL and get video info with AI analysis
        const result = await processYoutubeUrl(youtubeInfo.url);
        
        if (!result.success) {
            await sock.sendMessage(sender, {
                text: result.message || 'ga bisa akses video nya bro 😓'
            }, { quoted: msg });
            return;
        }

        // Store the video URL for later download
        pendingYoutubeDownloads.set(result.info.id, {
            url: youtubeInfo.url,
            title: result.info.title,
            timestamp: Date.now()
        });

        // Send AI analysis
        await smartSend(sock, sender, result.analysis, { quoted: msg });

        // Send format selection message
        await sock.sendMessage(sender, {
            text: `📥 *Mau download?*\n\nKetik:\n• *mp3* - untuk audio aja\n• *mp4* - untuk video lengkap\n\nAtau ketik *skip* kalo ga jadi`,
        });

        // Save to database
        saveMessage({
            chatId: sender,
            senderJid: 'bot',
            senderName: 'Tama',
            role: 'assistant',
            content: result.analysis,
            messageId: `bot_${Date.now()}`
        });

    } catch (error) {
        console.error('[Bot] Error processing YouTube URL:', error.message);
        await reportBugToOwner(sock, sender, msg.pushName || 'User', error, 'YouTube URL Processing', msg);
    }

    await sock.sendPresenceUpdate('paused', sender);
};

/**
 * Handle YouTube download request
 */
const handleYoutubeDownload = async (msg, sender, videoId, format) => {
    console.log(`[Bot] YouTube download: ${videoId} as ${format}`);
    
    await sock.sendPresenceUpdate('composing', sender);

    // Get stored video info
    const stored = pendingYoutubeDownloads.get(videoId);
    if (!stored) {
        await sock.sendMessage(sender, {
            text: 'waduh video nya udah expired bro, kirim ulang link nya ya 😅'
        }, { quoted: msg });
        return;
    }

    try {
        // Send "downloading" message
        await sock.sendMessage(sender, {
            text: `⏳ lagi download ${format.toUpperCase()} nya bro, tunggu bentar ya...`
        });

        let result;
        if (format === 'mp3') {
            result = await downloadAsMP3(stored.url, videoId);
        } else {
            result = await downloadAsMP4(stored.url, videoId);
        }

        if (!result.success) {
            await sock.sendMessage(sender, {
                text: `❌ ${result.error}`
            }, { quoted: msg });
            return;
        }

        // Read the file
        const fileBuffer = await fs.promises.readFile(result.filePath);

        // Send the file
        if (format === 'mp3') {
            // ═══════════════════════════════════════════════════════════
            // PENTING: MP3 dikirim sebagai DOCUMENT bukan audio
            // Agar user bisa save file ke device, bukan cuma play di chat
            // ═══════════════════════════════════════════════════════════
            const sanitizedTitle = (stored.title || videoId)
                .replace(/[<>:"/\\|?*]/g, '_')  // Remove invalid chars
                .substring(0, 100);  // Limit length
            
            await sock.sendMessage(sender, {
                document: fileBuffer,
                mimetype: 'audio/mpeg',
                fileName: `${sanitizedTitle}.mp3`,
                caption: `🎵 *${stored.title || 'Audio'}*\n\n_File MP3 - tap untuk save ke device_`
            }, { quoted: msg });
        } else {
            await sock.sendMessage(sender, {
                video: fileBuffer,
                mimetype: 'video/mp4',
                fileName: `${stored.title || videoId}.mp4`,
                caption: `🎬 ${stored.title || 'Video'}`
            }, { quoted: msg });
        }

        // Cleanup
        await cleanupFile(result.filePath);
        pendingYoutubeDownloads.delete(videoId);

        // Save to database
        saveMessage({
            chatId: sender,
            senderJid: 'bot',
            senderName: 'Tama',
            role: 'assistant',
            content: `[Sent ${format.toUpperCase()}: ${stored.title}]`,
            messageId: `bot_${Date.now()}`
        });

    } catch (error) {
        console.error('[Bot] Error downloading YouTube:', error.message);
        await reportBugToOwner(sock, sender, msg.pushName || 'User', error, 'YouTube Download', msg);
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
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║  AI WhatsApp Chatbot - Tama Clone v2.6.0      ║');
    console.log('║  by el-pablos                                 ║');
    console.log('║  Features: Vision, Docs, YouTube, Tarot, Mood ║');
    console.log('║  NEW: Real-time Web Search, File Creator      ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log('');

    try {
        // 1. Start Health Check Server
        console.log('[Boot] Starting Health Check server...');
        await startHealthCheckServer();

        // 2. Sync DNS Record ke Cloudflare (optional)
        if (process.env.CF_ZONE_ID && process.env.CF_DNS_API_TOKEN && process.env.CF_TARGET_DOMAIN) {
            console.log('[Boot] Syncing DNS record to Cloudflare...');
            const dnsResult = await syncDNSRecord();
            console.log(`[Boot] DNS sync result: ${dnsResult.action}`);
        } else {
            console.log('[Boot] Cloudflare DNS not configured, skipping DNS sync.');
        }

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
