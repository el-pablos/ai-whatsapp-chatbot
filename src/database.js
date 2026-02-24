/**
 * Database Module - Chat Memory Storage
 * 
 * SQLite database untuk menyimpan conversation history per user
 * Session expires after 24 hours automatically
 * 
 * @author Tama El Pablo
 * @version 2.1.0
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database path
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'chat_memory.db');

// Session expiry: 24 hours in milliseconds
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
let db = null;

/**
 * Initialize database and create tables
 */
const initDatabase = () => {
    if (db) return db;
    
    db = new Database(DB_PATH);
    
    // Enable WAL mode for better concurrent performance
    db.pragma('journal_mode = WAL');
    
    // Create conversations table
    db.exec(`
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id TEXT NOT NULL,
            sender_jid TEXT NOT NULL,
            sender_name TEXT,
            role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
            content TEXT NOT NULL,
            message_id TEXT,
            quoted_message_id TEXT,
            quoted_content TEXT,
            media_type TEXT,
            media_caption TEXT,
            timestamp INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_conversations_chat_id ON conversations(chat_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp);
        CREATE INDEX IF NOT EXISTS idx_conversations_message_id ON conversations(message_id);
    `);
    
    // Create user profiles table (untuk nyimpan info user)
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_profiles (
            jid TEXT PRIMARY KEY,
            name TEXT,
            first_seen INTEGER,
            last_seen INTEGER,
            message_count INTEGER DEFAULT 0,
            metadata TEXT
        );
    `);
    
    // Create user preferences table (untuk nyimpan nickname dan setting user)
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_preferences (
            jid TEXT PRIMARY KEY,
            preferred_name TEXT,
            language TEXT DEFAULT 'id',
            response_style TEXT DEFAULT 'gaul',
            is_owner INTEGER DEFAULT 0,
            custom_settings TEXT,
            updated_at INTEGER
        );
        
        CREATE INDEX IF NOT EXISTS idx_user_preferences_jid ON user_preferences(jid);
    `);
    
    console.log('[Database] SQLite initialized at', DB_PATH);
    return db;
};

/**
 * Save a message to conversation history
 * 
 * @param {Object} params - Message parameters
 * @param {string} params.chatId - Chat ID (JID)
 * @param {string} params.senderJid - Sender's JID
 * @param {string} params.senderName - Sender's display name
 * @param {string} params.role - 'user' atau 'assistant'
 * @param {string} params.content - Message content
 * @param {string} params.messageId - Unique message ID
 * @param {string} params.quotedMessageId - ID of quoted message (if reply)
 * @param {string} params.quotedContent - Content of quoted message
 * @param {string} params.mediaType - Type of media (image, document, etc)
 * @param {string} params.mediaCaption - Caption for media
 */
const saveMessage = ({
    chatId,
    senderJid,
    senderName = 'Unknown',
    role,
    content,
    messageId = null,
    quotedMessageId = null,
    quotedContent = null,
    mediaType = null,
    mediaCaption = null
}) => {
    const database = initDatabase();
    
    const stmt = database.prepare(`
        INSERT INTO conversations 
        (chat_id, sender_jid, sender_name, role, content, message_id, quoted_message_id, quoted_content, media_type, media_caption, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const timestamp = Date.now();
    
    stmt.run(
        chatId,
        senderJid,
        senderName,
        role,
        content,
        messageId,
        quotedMessageId,
        quotedContent,
        mediaType,
        mediaCaption,
        timestamp
    );
    
    // Update user profile
    updateUserProfile(senderJid, senderName);
    
    return { chatId, messageId, timestamp };
};

/**
 * Get conversation history for a chat
 * Only returns messages from last 24 hours (session expiry)
 * 
 * @param {string} chatId - Chat ID (JID)
 * @param {number} limit - Max messages to retrieve (0 = unlimited)
 * @returns {Array} - Array of messages in OpenAI format
 */
const getConversationHistory = (chatId, limit = 0) => {
    const database = initDatabase();
    
    // Calculate cutoff time (24 hours ago)
    const cutoffTime = Date.now() - SESSION_EXPIRY_MS;
    
    let query = `
        SELECT role, content, quoted_content, media_type, media_caption, sender_name, timestamp
        FROM conversations 
        WHERE chat_id = ? AND timestamp > ?
        ORDER BY timestamp ASC
    `;
    
    if (limit > 0) {
        // Get last N messages within 24 hours
        query = `
            SELECT * FROM (
                SELECT role, content, quoted_content, media_type, media_caption, sender_name, timestamp
                FROM conversations 
                WHERE chat_id = ? AND timestamp > ?
                ORDER BY timestamp DESC
                LIMIT ?
            ) ORDER BY timestamp ASC
        `;
        const stmt = database.prepare(query);
        const rows = stmt.all(chatId, cutoffTime, limit);
        return formatMessagesForAI(rows);
    }
    
    const stmt = database.prepare(query);
    const rows = stmt.all(chatId, cutoffTime);
    return formatMessagesForAI(rows);
};

/**
 * Format database rows to OpenAI message format
 * 
 * @param {Array} rows - Database rows
 * @returns {Array} - Formatted messages
 */
const formatMessagesForAI = (rows) => {
    return rows.map(row => {
        let content = row.content;
        
        // Add context for quoted/reply messages
        if (row.quoted_content) {
            content = `[Membalas pesan: "${row.quoted_content}"]\n\n${content}`;
        }
        
        // Add media context
        if (row.media_type) {
            const mediaDesc = row.media_caption ? `: ${row.media_caption}` : '';
            content = `[User mengirim ${row.media_type}${mediaDesc}]\n\n${content}`;
        }
        
        return {
            role: row.role,
            content: content
        };
    });
};

/**
 * Get message by ID (untuk fitur reply detection)
 * 
 * @param {string} messageId - Message ID
 * @returns {Object|null} - Message object atau null
 */
const getMessageById = (messageId) => {
    if (!messageId) return null;
    
    const database = initDatabase();
    
    const stmt = database.prepare(`
        SELECT * FROM conversations WHERE message_id = ? LIMIT 1
    `);
    
    return stmt.get(messageId) || null;
};

/**
 * Get the bot's response that was sent right after a specific message
 * Useful for finding the analysis/response for a quoted media message
 * 
 * @param {string} chatId - Chat ID (JID)
 * @param {string} messageId - The original message ID
 * @returns {Object|null} - Bot response message or null
 */
const getBotResponseAfter = (chatId, messageId) => {
    if (!chatId || !messageId) return null;
    
    const database = initDatabase();
    
    // Find the original message timestamp
    const originalMsg = database.prepare(
        `SELECT timestamp FROM conversations WHERE message_id = ? LIMIT 1`
    ).get(messageId);
    
    if (!originalMsg) return null;
    
    // Find the next bot response after this message
    const stmt = database.prepare(`
        SELECT * FROM conversations 
        WHERE chat_id = ? AND role = 'assistant' AND timestamp > ? 
        ORDER BY timestamp ASC 
        LIMIT 1
    `);
    
    return stmt.get(chatId, originalMsg.timestamp) || null;
};

/**
 * Update or create user profile
 * 
 * @param {string} jid - User's JID
 * @param {string} name - User's display name
 */
const updateUserProfile = (jid, name) => {
    const database = initDatabase();
    const now = Date.now();
    
    const stmt = database.prepare(`
        INSERT INTO user_profiles (jid, name, first_seen, last_seen, message_count)
        VALUES (?, ?, ?, ?, 1)
        ON CONFLICT(jid) DO UPDATE SET
            name = COALESCE(excluded.name, user_profiles.name),
            last_seen = excluded.last_seen,
            message_count = user_profiles.message_count + 1
    `);
    
    stmt.run(jid, name, now, now);
};

/**
 * Get user profile
 * 
 * @param {string} jid - User's JID
 * @returns {Object|null} - User profile
 */
const getUserProfile = (jid) => {
    const database = initDatabase();
    
    const stmt = database.prepare(`
        SELECT * FROM user_profiles WHERE jid = ?
    `);
    
    return stmt.get(jid) || null;
};

/**
 * Clear conversation history for a chat
 * 
 * @param {string} chatId - Chat ID to clear
 */
const clearConversation = (chatId) => {
    const database = initDatabase();
    
    const stmt = database.prepare(`
        DELETE FROM conversations WHERE chat_id = ?
    `);
    
    stmt.run(chatId);
    console.log(`[Database] Cleared conversation for ${chatId}`);
};

/**
 * Get conversation stats
 * 
 * @returns {Object} - Database statistics
 */
const getStats = () => {
    const database = initDatabase();
    
    const cutoffTime = Date.now() - SESSION_EXPIRY_MS;
    
    const totalMessages = database.prepare(`SELECT COUNT(*) as count FROM conversations`).get();
    const activeMessages = database.prepare(`SELECT COUNT(*) as count FROM conversations WHERE timestamp > ?`).get(cutoffTime);
    const totalUsers = database.prepare(`SELECT COUNT(*) as count FROM user_profiles`).get();
    const totalChats = database.prepare(`SELECT COUNT(DISTINCT chat_id) as count FROM conversations`).get();
    const activeChats = database.prepare(`SELECT COUNT(DISTINCT chat_id) as count FROM conversations WHERE timestamp > ?`).get(cutoffTime);
    
    return {
        totalMessages: totalMessages.count,
        activeMessages: activeMessages.count,
        expiredMessages: totalMessages.count - activeMessages.count,
        totalUsers: totalUsers.count,
        totalChats: totalChats.count,
        activeChats: activeChats.count,
        sessionExpiryHours: 24
    };
};

/**
 * Get all users with their phone numbers
 * 
 * @returns {Array} - Array of user info with phone numbers
 */
const getAllUsers = () => {
    const database = initDatabase();
    
    const stmt = database.prepare(`
        SELECT 
            jid,
            name,
            first_seen,
            last_seen,
            message_count
        FROM user_profiles 
        ORDER BY last_seen DESC
    `);
    
    const users = stmt.all();
    
    return users.map(user => {
        // Extract phone number from JID (format: 628xxx@s.whatsapp.net)
        const phoneNumber = user.jid ? user.jid.replace('@s.whatsapp.net', '').replace('@g.us', '') : 'Unknown';
        const isGroup = user.jid && user.jid.includes('@g.us');
        
        return {
            jid: user.jid,
            phoneNumber: phoneNumber,
            name: user.name || 'Unknown',
            firstSeen: user.first_seen,
            lastSeen: user.last_seen,
            messageCount: user.message_count,
            isGroup: isGroup,
            isActive: (Date.now() - user.last_seen) < SESSION_EXPIRY_MS
        };
    });
};

/**
 * Cleanup expired sessions (messages older than 24 hours)
 * Call this periodically to clean up old data
 * 
 * @returns {Object} - Cleanup result with deleted count
 */
const cleanupExpiredSessions = () => {
    const database = initDatabase();
    
    const cutoffTime = Date.now() - SESSION_EXPIRY_MS;
    
    // Get count before deletion
    const beforeCount = database.prepare(`SELECT COUNT(*) as count FROM conversations WHERE timestamp <= ?`).get(cutoffTime);
    
    // Delete expired messages
    const stmt = database.prepare(`DELETE FROM conversations WHERE timestamp <= ?`);
    const result = stmt.run(cutoffTime);
    
    console.log(`[Database] Cleaned up ${result.changes} expired messages (older than 24 hours)`);
    
    return {
        deletedCount: result.changes,
        cutoffTime: cutoffTime,
        cutoffDate: new Date(cutoffTime).toISOString()
    };
};

/**
 * Close database connection
 */
const closeDatabase = () => {
    if (db) {
        db.close();
        db = null;
        console.log('[Database] Connection closed');
    }
};

// ═══════════════════════════════════════════════════════════
// USER PREFERENCES FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Owner phone numbers (can have multiple)
 * Format: without country code prefix variations
 */
const OWNER_NUMBERS = [
    '6282210819939',  // With country code
    '082210819939',   // Without country code
];

/**
 * Check if a JID belongs to the owner
 * @param {string} jid - User's JID (e.g., 6282210819939@s.whatsapp.net)
 * @returns {boolean}
 */
const isOwner = (jid) => {
    if (!jid) return false;
    const phoneNumber = jid.replace('@s.whatsapp.net', '').replace('@g.us', '');
    return OWNER_NUMBERS.some(ownerNum => 
        phoneNumber === ownerNum || 
        phoneNumber.endsWith(ownerNum.replace(/^0/, '')) ||
        ownerNum.endsWith(phoneNumber.replace(/^62/, ''))
    );
};

/**
 * Get user preferences
 * @param {string} jid - User's JID
 * @returns {Object|null}
 */
const getUserPreferences = (jid) => {
    const database = initDatabase();
    
    const stmt = database.prepare(`
        SELECT * FROM user_preferences WHERE jid = ?
    `);
    
    const prefs = stmt.get(jid);
    if (prefs) {
        prefs.is_owner = isOwner(jid) ? 1 : prefs.is_owner;
    }
    return prefs || { jid, is_owner: isOwner(jid) ? 1 : 0 };
};

/**
 * Save user preference (e.g., preferred nickname)
 * @param {string} jid - User's JID  
 * @param {string} key - Preference key (preferred_name, language, etc.)
 * @param {any} value - Preference value
 */
const saveUserPreference = (jid, key, value) => {
    const database = initDatabase();
    
    const allowedKeys = ['preferred_name', 'language', 'response_style', 'custom_settings'];
    if (!allowedKeys.includes(key)) {
        console.error(`[Database] Invalid preference key: ${key}`);
        return false;
    }
    
    const stmt = database.prepare(`
        INSERT INTO user_preferences (jid, ${key}, is_owner, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(jid) DO UPDATE SET
            ${key} = excluded.${key},
            updated_at = excluded.updated_at
    `);
    
    stmt.run(jid, value, isOwner(jid) ? 1 : 0, Date.now());
    console.log(`[Database] Saved preference ${key}=${value} for ${jid}`);
    return true;
};

/**
 * Get user's preferred name/nickname
 * @param {string} jid - User's JID
 * @param {string} defaultName - Default name to use if no preference
 * @returns {string}
 */
const getPreferredName = (jid, defaultName = 'bro') => {
    const prefs = getUserPreferences(jid);
    return prefs?.preferred_name || defaultName;
};

/**
 * Detect and save nickname preference from message
 * Patterns: "panggil gw X", "nama gw X", "call me X"
 * @param {string} jid - User's JID
 * @param {string} message - User's message
 * @returns {string|null} - Detected nickname or null
 */
const detectNicknamePreference = (jid, message) => {
    if (!message) return null;
    
    // IMPORTANT: More specific patterns MUST come first to avoid false matches
    const patterns = [
        // "jangan panggil gw bro, panggil X" - must be first because it contains "panggil gw"
        /jangan\s+(?:panggil|sebut)\s+(?:gw|gue|w|aku)\s+bro,?\s*(?:panggil|sebut)?\s*(.+)/i,
        // "gw mau dipanggil X"
        /(?:gw|gue|w|aku)\s+(?:mau dipanggil|pengen dipanggil)\s+(.+)/i,
        // "nama gw X"
        /(?:nama|name)\s+(?:gw|gue|w|aku|saya)\s+(.+)/i,
        // "panggil gw X" - more general pattern last
        /(?:panggil|sebut|call)\s+(?:gw|gue|w|aku|saya|me)\s+(.+)/i,
    ];
    
    for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
            const nickname = match[1].trim().replace(/[.,!?]+$/, '').trim();
            if (nickname.length > 0 && nickname.length < 50) {
                saveUserPreference(jid, 'preferred_name', nickname);
                return nickname;
            }
        }
    }
    
    return null;
};

module.exports = {
    initDatabase,
    saveMessage,
    getConversationHistory,
    getMessageById,
    getBotResponseAfter,
    getUserProfile,
    updateUserProfile,
    clearConversation,
    getStats,
    getAllUsers,
    cleanupExpiredSessions,
    closeDatabase,
    // New exports for user preferences
    isOwner,
    getUserPreferences,
    saveUserPreference,
    getPreferredName,
    detectNicknamePreference,
    OWNER_NUMBERS
};
