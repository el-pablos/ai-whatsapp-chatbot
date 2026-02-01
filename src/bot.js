/**
 * AI WhatsApp Chatbot - Main Bot Service
 * 
 * Bot WhatsApp menggunakan @whiskeysockets/baileys dengan:
 * - Persona AI "Tama" via Copilot API
 * - Auto reconnect handling
 * - Health Check server
 * - Cloudflare DNS automation
 * 
 * @author Tama (el-pablos)
 * @version 1.0.0
 */

// Load environment variables
require('dotenv').config();

const makeWASocket = require('@whiskeysockets/baileys').default;
const { 
    useMultiFileAuthState, 
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

const { fetchCopilotResponse } = require('./aiHandler');
const { startHealthCheckServer } = require('./healthCheck');
const { syncDNSRecord } = require('./dnsUpdater');

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
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_INTERVAL = 5000; // 5 detik

/**
 * Inisialisasi dan connect ke WhatsApp
 */
const connectToWhatsApp = async () => {
    if (isConnecting) {
        console.log('[Bot] Already connecting, skip...');
        return;
    }

    isConnecting = true;

    try {
        // Load auth state dari folder
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
        
        // Fetch versi Baileys terbaru
        const { version } = await fetchLatestBaileysVersion();
        console.log(`[Bot] Using Baileys version: ${version.join('.')}`);

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
            getMessage: async () => undefined // Tidak perlu fetch ulang pesan
        });

        // Handle credentials update
        sock.ev.on('creds.update', saveCreds);

        // Handle connection update
        sock.ev.on('connection.update', handleConnectionUpdate);

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
 * 
 * @param {Object} update - Connection update object
 */
const handleConnectionUpdate = async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
        console.log('[Bot] QR Code received - scan dengan WA kamu ya bro! 📱');
        console.log('');
        qrcode.generate(qr, { small: true });
        console.log('');
    }

    if (connection === 'close') {
        isConnecting = false;
        
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(`[Bot] Connection closed. Status: ${statusCode}`);

        if (shouldReconnect) {
            console.log('[Bot] Bukan logout, attempting reconnect...');
            scheduleReconnect();
        } else {
            console.log('[Bot] Logged out dari WA, hapus folder auth_info_baileys untuk scan ulang');
            reconnectAttempts = 0;
        }
    }

    if (connection === 'open') {
        isConnecting = false;
        reconnectAttempts = 0;
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
    const delay = RECONNECT_INTERVAL * reconnectAttempts; // Exponential backoff sederhana
    
    console.log(`[Bot] Reconnecting in ${delay/1000}s... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    
    setTimeout(() => {
        connectToWhatsApp();
    }, delay);
};

/**
 * Handle incoming messages
 * 
 * @param {Object} param0 - Messages upsert event
 */
const handleMessagesUpsert = async ({ messages, type }) => {
    // Hanya proses pesan baru (bukan history)
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
 * 
 * @param {Object} msg - Message object dari Baileys
 */
const processMessage = async (msg) => {
    // Skip jika:
    // 1. Pesan dari diri sendiri (key.fromMe)
    // 2. Status broadcast (status@broadcast)
    // 3. Tidak ada conversation/extendedTextMessage (bukan text)
    
    if (msg.key.fromMe) return;
    if (msg.key.remoteJid === 'status@broadcast') return;

    // Extract text content
    const textContent = msg.message?.conversation || 
                       msg.message?.extendedTextMessage?.text ||
                       null;

    if (!textContent) return; // Skip non-text messages

    const sender = msg.key.remoteJid;
    const pushName = msg.pushName || 'Bro';

    console.log(`[Bot] Pesan masuk dari ${pushName} (${sender}): ${textContent}`);

    // Kirim "typing" indicator
    await sock.sendPresenceUpdate('composing', sender);

    try {
        // Fetch AI response dengan persona Tama
        const aiResponse = await fetchCopilotResponse(textContent);

        console.log(`[Bot] Response untuk ${pushName}: ${aiResponse}`);

        // Kirim response
        await sock.sendMessage(sender, { 
            text: aiResponse 
        }, { 
            quoted: msg // Quote pesan original
        });

    } catch (error) {
        console.error('[Bot] Error getting AI response:', error.message);
        
        // Kirim fallback response
        await sock.sendMessage(sender, {
            text: 'duh error euy sistem w 😓 coba lgi nnt ya'
        }, {
            quoted: msg
        });
    }

    // Clear typing indicator
    await sock.sendPresenceUpdate('paused', sender);
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async (signal) => {
    console.log(`\n[Bot] Received ${signal}, shutting down gracefully...`);
    
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
    console.log('║  AI WhatsApp Chatbot - Tama Clone v1.0.0   ║');
    console.log('║  by el-pablos                              ║');
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
        if (dnsResult.action === 'failed') {
            console.warn('[Boot] DNS sync failed, but continuing anyway...');
        }

        // 3. Connect ke WhatsApp
        console.log('[Boot] Connecting to WhatsApp...');
        await connectToWhatsApp();

    } catch (error) {
        console.error('[Boot] Fatal error during startup:', error.message);
        process.exit(1);
    }
};

// Handle process signals untuk graceful shutdown
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('[Bot] Uncaught Exception:', error);
    // Jangan exit, biarkan reconnect logic handle
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
