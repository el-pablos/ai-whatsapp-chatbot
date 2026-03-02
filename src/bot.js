/**
 * AI WhatsApp Chatbot - Main Bot Service v2.7
 *
 * Bot WhatsApp menggunakan @whiskeysockets/baileys dengan:
 * - Auto-setup: npm install, yt-dlp, ffmpeg on every boot
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
 * @version 2.7.0
 */

// ═══════════════════════════════════════════════════════════
// AUTO-SETUP: runs BEFORE any npm module is loaded
// Installs npm deps, yt-dlp, ffmpeg, creates dirs
// Uses only Node.js built-ins — safe even without node_modules
// ═══════════════════════════════════════════════════════════
require('./autoSetup');

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

// ═══════════════════════════════════════════════════════════
// AI-FIRST ARCHITECTURE: imports
// ═══════════════════════════════════════════════════════════
const { normalizeMessage } = require('./messageNormalizer');
const { routeMessage } = require('./intentRouter');

// Legacy imports (still used for lifecycle / helpers)
const { startHealthCheckServer } = require('./healthCheck');
const { syncDNSRecord } = require('./dnsUpdater');
const { 
    initDatabase, 
    closeDatabase,
    scheduleRetentionCleanup
} = require('./database');
const {
    scheduleBackup,
    stopBackup
} = require('./backupHandler');
const { checkDependencies } = require('./youtubeHandler');
const { reportBugToOwner } = require('./bugReporter');

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
 * Process individual message — AI-First Architecture v3.0
 */
const processMessage = async (msg) => {
    if (msg.key.fromMe) return;
    if (msg.key.remoteJid === 'status@broadcast') return;

    // Unwrap viewOnce/ephemeral/docWithCaption
    if (msg.message) {
        if (msg.message.viewOnceMessage) msg.message = msg.message.viewOnceMessage.message || msg.message;
        if (msg.message.viewOnceMessageV2) msg.message = msg.message.viewOnceMessageV2.message || msg.message;
        if (msg.message.ephemeralMessage) msg.message = msg.message.ephemeralMessage.message || msg.message;
        if (msg.message.documentWithCaptionMessage) msg.message = msg.message.documentWithCaptionMessage.message || msg.message;
    }

    const sender = msg.key.remoteJid;
    const messageId = msg.key.id;

    // DEDUPLICATION 1: message ID
    if (processedMessages.has(messageId)) return;

    // DEDUPLICATION 2: content hash (Baileys double-fire protection)
    const msgTextContent = msg.message?.conversation ||
                       msg.message?.extendedTextMessage?.text ||
                       msg.message?.imageMessage?.caption ||
                       msg.message?.documentMessage?.fileName || '';
    if (msgTextContent.length > 0) {
        const contentHash = generateContentHash(`${sender}:${msgTextContent}`);
        if (recentMessageHashes.has(contentHash)) return;
        recentMessageHashes.set(contentHash, Date.now());
    }
    processedMessages.set(messageId, Date.now());

    // AI-FIRST: Normalize → Route
    const normalized = normalizeMessage(msg);
    console.log(`[Bot] ${normalized.pushName} (${sender}): ${(normalized.text || `[${normalized.messageType}]`).slice(0, 80)}`);

    await routeMessage(normalized, { sock, rawMsg: msg });
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
    console.log('║  AI WhatsApp Chatbot - AI-First v3.0.0      ║');
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
