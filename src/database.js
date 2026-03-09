/**
 * Database Module - Chat Memory Storage
 * 
 * SQLite database untuk menyimpan conversation history per user
 * Retention policy: 6 months (configurable via RETENTION_MONTHS env)
 * Context window: 24 hours for AI context (configurable via SESSION_EXPIRY_HOURS env)
 * 
 * @author Tama El Pablo
 * @version 2.7.0
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database path
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'chat_memory.db');

// Session expiry for AI context window: 24 hours default
const SESSION_EXPIRY_MS = (parseInt(process.env.SESSION_EXPIRY_HOURS, 10) || 24) * 60 * 60 * 1000;

// Retention policy: 6 months default (data older than this gets cleaned up)
const RETENTION_MONTHS = parseInt(process.env.RETENTION_MONTHS, 10) || 6;
const RETENTION_MS = RETENTION_MONTHS * 30 * 24 * 60 * 60 * 1000; // approx months in ms

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

    // Long-term memory table
    db.exec(`
        CREATE TABLE IF NOT EXISTS long_term_memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'fact',
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_ltm_user ON long_term_memory(user_id);
        CREATE INDEX IF NOT EXISTS idx_ltm_category ON long_term_memory(user_id, category);
    `);

    // Reminders table
    db.exec(`
        CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            chat_id TEXT NOT NULL,
            message TEXT NOT NULL,
            remind_at DATETIME NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);
        CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status, remind_at);
    `);

    // Notes table
    db.exec(`
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'note',
            title TEXT,
            content TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
        CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(user_id, type);
    `);

    // Polls table
    db.exec(`
        CREATE TABLE IF NOT EXISTS polls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id TEXT NOT NULL,
            creator_id TEXT NOT NULL,
            question TEXT NOT NULL,
            options TEXT NOT NULL,
            votes TEXT DEFAULT '{}',
            status TEXT DEFAULT 'open',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME
        );
        CREATE INDEX IF NOT EXISTS idx_polls_chat ON polls(chat_id, status);
    `);

    // RSS feeds table
    db.exec(`
        CREATE TABLE IF NOT EXISTS rss_feeds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            url TEXT NOT NULL,
            title TEXT,
            last_checked DATETIME,
            last_entry_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_rss_user ON rss_feeds(user_id);
    `);

    // Scheduled messages table
    db.exec(`
        CREATE TABLE IF NOT EXISTS scheduled_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            creator_id TEXT NOT NULL,
            target_chat TEXT NOT NULL,
            message TEXT NOT NULL,
            scheduled_at DATETIME NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_sched_status ON scheduled_messages(status, scheduled_at);
    `);

    // ═══════════════════════════════════════════════════════════
    //  V4.1 TABLES — Dashboard, Allowlist, Feature Toggles, Admin
    // ═══════════════════════════════════════════════════════════

    db.exec(`
        CREATE TABLE IF NOT EXISTS allowlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone_number TEXT NOT NULL UNIQUE,
            display_name TEXT,
            added_by TEXT NOT NULL,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active INTEGER DEFAULT 1,
            notes TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_allowlist_phone ON allowlist(phone_number);
        CREATE INDEX IF NOT EXISTS idx_allowlist_active ON allowlist(is_active);
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS bot_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            config_key TEXT NOT NULL UNIQUE,
            config_value TEXT NOT NULL,
            description TEXT,
            config_type TEXT DEFAULT 'string',
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_by TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_bot_config_key ON bot_config(config_key);
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS feature_toggles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            feature_id TEXT NOT NULL UNIQUE,
            is_enabled INTEGER DEFAULT 1,
            disabled_by TEXT,
            disabled_at DATETIME,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_feature_toggles_id ON feature_toggles(feature_id);
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            display_name TEXT,
            role TEXT DEFAULT 'admin',
            last_login DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active INTEGER DEFAULT 1
        );
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS admin_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_token TEXT NOT NULL UNIQUE,
            admin_id INTEGER NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            FOREIGN KEY (admin_id) REFERENCES admin_users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_id INTEGER,
            action TEXT NOT NULL,
            target TEXT,
            details TEXT,
            ip_address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);
    `);

    // ═══════════════════════════════════════════════════════════
    //  V5 TABLES — Verification Sources
    // ═══════════════════════════════════════════════════════════

    db.exec(`
        CREATE TABLE IF NOT EXISTS verification_sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id TEXT NOT NULL,
            message_id TEXT,
            query TEXT,
            sources TEXT,
            confidence REAL,
            verified INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_verification_chat ON verification_sources(chat_id);
        CREATE INDEX IF NOT EXISTS idx_verification_created ON verification_sources(created_at);
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
    // Defensive validation - prevent NOT NULL constraint errors
    if (!chatId) {
        console.error('[Database] saveMessage REJECTED: chatId is null/undefined', {
            senderJid, senderName, role, content: (content || '').substring(0, 100),
        });
        return null;
    }
    if (!role) {
        console.error('[Database] saveMessage REJECTED: role is null/undefined', {
            chatId, senderJid, senderName, content: (content || '').substring(0, 100),
        });
        return null;
    }

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
        sessionExpiryHours: SESSION_EXPIRY_MS / (60 * 60 * 1000),
        retentionMonths: RETENTION_MONTHS
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
 * Cleanup messages older than retention period (default: 6 months).
 * - Idempotent: safe to run repeatedly
 * - Batched: deletes in chunks to avoid blocking event loop
 * - Backward-compatible: records without timestamp are preserved (not deleted)
 * 
 * @param {number} batchSize - Number of rows to delete per batch (default 1000)
 * @returns {Object} - Cleanup result with deleted count
 */
const cleanupExpiredSessions = (batchSize = 1000) => {
    const database = initDatabase();
    
    const cutoffTime = Date.now() - RETENTION_MS;
    
    // Count how many messages will be deleted
    // Only delete messages that HAVE a valid timestamp AND are older than retention
    // Records with timestamp=0 or NULL are preserved (legacy data without proper timestamps)
    const beforeCount = database.prepare(
        `SELECT COUNT(*) as count FROM conversations WHERE timestamp > 0 AND timestamp <= ?`
    ).get(cutoffTime);
    
    let totalDeleted = 0;
    
    if (beforeCount.count > 0) {
        // Batch delete to avoid long locks
        const deleteStmt = database.prepare(
            `DELETE FROM conversations WHERE rowid IN (
                SELECT rowid FROM conversations WHERE timestamp > 0 AND timestamp <= ? LIMIT ?
            )`
        );
        
        let deleted;
        do {
            deleted = deleteStmt.run(cutoffTime, batchSize).changes;
            totalDeleted += deleted;
        } while (deleted === batchSize);
    }
    
    // Also clean up very old user_profiles that haven't been seen in retention period
    const profileCleanup = database.prepare(
        `DELETE FROM user_profiles WHERE last_seen > 0 AND last_seen <= ? AND jid NOT IN (
            SELECT DISTINCT chat_id FROM conversations
        )`
    ).run(cutoffTime);
    
    if (totalDeleted > 0 || profileCleanup.changes > 0) {
        console.log(`[Database] Retention cleanup: ${totalDeleted} messages, ${profileCleanup.changes} orphan profiles removed (older than ${RETENTION_MONTHS} months)`);
    }
    
    return {
        deletedCount: totalDeleted,
        orphanProfilesDeleted: profileCleanup.changes,
        cutoffTime: cutoffTime,
        cutoffDate: new Date(cutoffTime).toISOString(),
        retentionMonths: RETENTION_MONTHS
    };
};

/**
 * Schedule automatic retention cleanup.
 * Runs once daily at ~03:00 local time.
 * Safe to call multiple times (idempotent).
 */
let _retentionTimer = null;
const scheduleRetentionCleanup = () => {
    if (_retentionTimer) return; // already scheduled
    
    // Run cleanup immediately on startup (lightweight if nothing to delete)
    try {
        cleanupExpiredSessions();
    } catch (e) {
        console.error('[Database] Startup retention cleanup error:', e.message);
    }
    
    // Then run every 24 hours
    _retentionTimer = setInterval(() => {
        try {
            cleanupExpiredSessions();
        } catch (e) {
            console.error('[Database] Scheduled retention cleanup error:', e.message);
        }
    }, 24 * 60 * 60 * 1000);
    
    // Don't prevent process exit
    if (_retentionTimer.unref) _retentionTimer.unref();
    
    console.log(`[Database] Retention cleanup scheduled (policy: ${RETENTION_MONTHS} months)`);
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
 * Owner phone numbers — delegates to userProfileHelper for single source of truth
 */
const { OWNER_PHONES: _OWNER_PHONES, isOwnerPhone: _isOwnerPhone } = require('./userProfileHelper');

// Keep OWNER_NUMBERS export for backward compat (same as OWNER_PHONES)
const OWNER_NUMBERS = _OWNER_PHONES;

/**
 * Check if a JID belongs to the owner
 * @param {string} jid - User's JID (e.g., 6282210819939@s.whatsapp.net)
 * @returns {boolean}
 */
const isOwner = (jid) => _isOwnerPhone(jid);

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

// ═══════════════════════════════════════════════════════════
//  LONG-TERM MEMORY CRUD
// ═══════════════════════════════════════════════════════════

const saveMemory = (userId, category, key, value) => {
    const database = initDatabase();
    const existing = database.prepare(
        'SELECT id FROM long_term_memory WHERE user_id = ? AND key = ?'
    ).get(userId, key);
    if (existing) {
        database.prepare(
            'UPDATE long_term_memory SET value = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(value, category, existing.id);
        return { id: existing.id, updated: true };
    }
    const result = database.prepare(
        'INSERT INTO long_term_memory (user_id, category, key, value) VALUES (?, ?, ?, ?)'
    ).run(userId, category, key, value);
    return { id: result.lastInsertRowid, updated: false };
};

const searchMemory = (userId, query) => {
    const database = initDatabase();
    return database.prepare(
        "SELECT * FROM long_term_memory WHERE user_id = ? AND (key LIKE ? OR value LIKE ?) ORDER BY updated_at DESC LIMIT 20"
    ).all(userId, `%${query}%`, `%${query}%`);
};

const getMemories = (userId, category = null) => {
    const database = initDatabase();
    if (category) {
        return database.prepare(
            'SELECT * FROM long_term_memory WHERE user_id = ? AND category = ? ORDER BY updated_at DESC'
        ).all(userId, category);
    }
    return database.prepare(
        'SELECT * FROM long_term_memory WHERE user_id = ? ORDER BY updated_at DESC'
    ).all(userId);
};

const deleteMemory = (userId, key) => {
    const database = initDatabase();
    const result = database.prepare(
        'DELETE FROM long_term_memory WHERE user_id = ? AND key = ?'
    ).run(userId, key);
    return result.changes > 0;
};

// ═══════════════════════════════════════════════════════════
//  REMINDERS CRUD
// ═══════════════════════════════════════════════════════════

const createReminder = (userId, chatId, message, remindAt) => {
    const database = initDatabase();
    const result = database.prepare(
        'INSERT INTO reminders (user_id, chat_id, message, remind_at) VALUES (?, ?, ?, ?)'
    ).run(userId, chatId, message, remindAt);
    return { id: result.lastInsertRowid };
};

const getPendingReminders = () => {
    const database = initDatabase();
    return database.prepare(
        "SELECT * FROM reminders WHERE status = 'pending' AND remind_at <= datetime('now')"
    ).all();
};

const getUserReminders = (userId) => {
    const database = initDatabase();
    return database.prepare(
        "SELECT * FROM reminders WHERE user_id = ? AND status = 'pending' ORDER BY remind_at ASC"
    ).all(userId);
};

const markReminderDone = (id) => {
    const database = initDatabase();
    database.prepare("UPDATE reminders SET status = 'done' WHERE id = ?").run(id);
};

const deleteReminder = (userId, id) => {
    const database = initDatabase();
    const result = database.prepare(
        'DELETE FROM reminders WHERE user_id = ? AND id = ?'
    ).run(userId, id);
    return result.changes > 0;
};

// ═══════════════════════════════════════════════════════════
//  NOTES CRUD
// ═══════════════════════════════════════════════════════════

const createNote = (userId, type, title, content) => {
    const database = initDatabase();
    const result = database.prepare(
        'INSERT INTO notes (user_id, type, title, content) VALUES (?, ?, ?, ?)'
    ).run(userId, type, title, content);
    return { id: result.lastInsertRowid };
};

const getUserNotes = (userId, type = null) => {
    const database = initDatabase();
    if (type) {
        return database.prepare(
            'SELECT * FROM notes WHERE user_id = ? AND type = ? ORDER BY created_at DESC'
        ).all(userId, type);
    }
    return database.prepare(
        'SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC'
    ).all(userId);
};

const searchNotes = (userId, query) => {
    const database = initDatabase();
    return database.prepare(
        "SELECT * FROM notes WHERE user_id = ? AND (title LIKE ? OR content LIKE ?) ORDER BY created_at DESC"
    ).all(userId, `%${query}%`, `%${query}%`);
};

const updateNoteStatus = (userId, id, status) => {
    const database = initDatabase();
    const result = database.prepare(
        'UPDATE notes SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND id = ?'
    ).run(status, userId, id);
    return result.changes > 0;
};

const deleteNote = (userId, id) => {
    const database = initDatabase();
    const result = database.prepare(
        'DELETE FROM notes WHERE user_id = ? AND id = ?'
    ).run(userId, id);
    return result.changes > 0;
};

// ═══════════════════════════════════════════════════════════
//  POLLS CRUD
// ═══════════════════════════════════════════════════════════

const createPoll = (chatId, creatorId, question, options) => {
    const database = initDatabase();
    const result = database.prepare(
        'INSERT INTO polls (chat_id, creator_id, question, options) VALUES (?, ?, ?, ?)'
    ).run(chatId, creatorId, question, JSON.stringify(options));
    return { id: result.lastInsertRowid };
};

const getPoll = (pollId) => {
    const database = initDatabase();
    const row = database.prepare('SELECT * FROM polls WHERE id = ?').get(pollId);
    if (!row) return null;
    row.options = JSON.parse(row.options);
    row.votes = JSON.parse(row.votes || '{}');
    return row;
};

const getActivePoll = (chatId) => {
    const database = initDatabase();
    const row = database.prepare(
        "SELECT * FROM polls WHERE chat_id = ? AND status = 'open' ORDER BY created_at DESC LIMIT 1"
    ).get(chatId);
    if (!row) return null;
    row.options = JSON.parse(row.options);
    row.votes = JSON.parse(row.votes || '{}');
    return row;
};

const votePoll = (pollId, userId, optionIndex) => {
    const database = initDatabase();
    const poll = getPoll(pollId);
    if (!poll || poll.status !== 'open') return { success: false, error: 'Poll not found or closed' };
    if (optionIndex < 0 || optionIndex >= poll.options.length) return { success: false, error: 'Invalid option' };
    const votes = poll.votes;
    votes[userId] = optionIndex;
    database.prepare('UPDATE polls SET votes = ? WHERE id = ?').run(JSON.stringify(votes), pollId);
    return { success: true, option: poll.options[optionIndex] };
};

const closePoll = (pollId) => {
    const database = initDatabase();
    database.prepare("UPDATE polls SET status = 'closed' WHERE id = ?").run(pollId);
};

const getPollResults = (pollId) => {
    const poll = getPoll(pollId);
    if (!poll) return null;
    const tally = {};
    poll.options.forEach((_, i) => { tally[i] = 0; });
    Object.values(poll.votes).forEach(idx => { tally[idx] = (tally[idx] || 0) + 1; });
    const totalVotes = Object.values(tally).reduce((a, b) => a + b, 0);
    return {
        question: poll.question,
        options: poll.options,
        tally,
        totalVotes,
        status: poll.status,
    };
};

// ═══════════════════════════════════════════════════════════
//  RSS FEEDS CRUD
// ═══════════════════════════════════════════════════════════

const addRssFeed = (userId, url, title) => {
    const database = initDatabase();
    const result = database.prepare(
        'INSERT INTO rss_feeds (user_id, url, title) VALUES (?, ?, ?)'
    ).run(userId, url, title || null);
    return { id: result.lastInsertRowid };
};

const getUserFeeds = (userId) => {
    const database = initDatabase();
    return database.prepare(
        'SELECT * FROM rss_feeds WHERE user_id = ? ORDER BY created_at DESC'
    ).all(userId);
};

const updateFeedChecked = (feedId, lastEntryId) => {
    const database = initDatabase();
    database.prepare(
        'UPDATE rss_feeds SET last_checked = CURRENT_TIMESTAMP, last_entry_id = ? WHERE id = ?'
    ).run(lastEntryId, feedId);
};

const removeRssFeed = (userId, feedId) => {
    const database = initDatabase();
    const result = database.prepare(
        'DELETE FROM rss_feeds WHERE user_id = ? AND id = ?'
    ).run(userId, feedId);
    return result.changes > 0;
};

// ═══════════════════════════════════════════════════════════
//  SCHEDULED MESSAGES CRUD
// ═══════════════════════════════════════════════════════════

const createScheduledMessage = (creatorId, targetChat, message, scheduledAt) => {
    const database = initDatabase();
    const result = database.prepare(
        'INSERT INTO scheduled_messages (creator_id, target_chat, message, scheduled_at) VALUES (?, ?, ?, ?)'
    ).run(creatorId, targetChat, message, scheduledAt);
    return { id: result.lastInsertRowid };
};

const getPendingScheduledMessages = () => {
    const database = initDatabase();
    return database.prepare(
        "SELECT * FROM scheduled_messages WHERE status = 'pending' AND scheduled_at <= datetime('now')"
    ).all();
};

const markScheduledMessageSent = (id) => {
    const database = initDatabase();
    database.prepare("UPDATE scheduled_messages SET status = 'sent' WHERE id = ?").run(id);
};

const getUserScheduledMessages = (userId) => {
    const database = initDatabase();
    return database.prepare(
        "SELECT * FROM scheduled_messages WHERE creator_id = ? AND status = 'pending' ORDER BY scheduled_at ASC"
    ).all(userId);
};

// ═══════════════════════════════════════════════════════════
//  ALLOWLIST CRUD
// ═══════════════════════════════════════════════════════════

let allowlistCache = new Map();
let allowlistCacheTime = 0;
const ALLOWLIST_CACHE_TTL = 5 * 60 * 1000;

const normalizePhoneNumber = (phone) => {
    if (!phone) return '';
    let cleaned = phone.replace(/[^\d]/g, '');
    // Strip @s.whatsapp.net / @g.us
    cleaned = cleaned.split('@')[0];
    // 08xxx → 628xxx
    if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1);
    // +62xxx (already cleaned of +)
    return cleaned;
};

const refreshAllowlistCache = () => {
    const database = initDatabase();
    const rows = database.prepare('SELECT phone_number, display_name, is_active, notes FROM allowlist').all();
    allowlistCache.clear();
    for (const row of rows) {
        allowlistCache.set(row.phone_number, row);
    }
    allowlistCacheTime = Date.now();
};

const addToAllowlist = (phoneNumber, displayName, addedBy, notes) => {
    const database = initDatabase();
    const normalized = normalizePhoneNumber(phoneNumber);
    if (!normalized) return null;
    const stmt = database.prepare(
        `INSERT INTO allowlist (phone_number, display_name, added_by, notes)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(phone_number) DO UPDATE SET
           display_name = COALESCE(excluded.display_name, allowlist.display_name),
           notes = COALESCE(excluded.notes, allowlist.notes),
           is_active = 1,
           updated_at = CURRENT_TIMESTAMP`
    );
    stmt.run(normalized, displayName || null, addedBy, notes || null);
    refreshAllowlistCache();
    return { phone_number: normalized, display_name: displayName };
};

const removeFromAllowlist = (phoneNumber) => {
    const database = initDatabase();
    const normalized = normalizePhoneNumber(phoneNumber);
    const result = database.prepare('DELETE FROM allowlist WHERE phone_number = ?').run(normalized);
    refreshAllowlistCache();
    return result.changes > 0;
};

const toggleAllowlist = (phoneNumber, isActive) => {
    const database = initDatabase();
    const normalized = normalizePhoneNumber(phoneNumber);
    const result = database.prepare(
        'UPDATE allowlist SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE phone_number = ?'
    ).run(isActive ? 1 : 0, normalized);
    refreshAllowlistCache();
    return result.changes > 0;
};

const updateAllowlistEntry = (phoneNumber, fields) => {
    const database = initDatabase();
    const normalized = normalizePhoneNumber(phoneNumber);
    const sets = [];
    const vals = [];
    if (fields.display_name !== undefined) { sets.push('display_name = ?'); vals.push(fields.display_name); }
    if (fields.notes !== undefined) { sets.push('notes = ?'); vals.push(fields.notes); }
    if (fields.is_active !== undefined) { sets.push('is_active = ?'); vals.push(fields.is_active ? 1 : 0); }
    if (sets.length === 0) return false;
    sets.push('updated_at = CURRENT_TIMESTAMP');
    vals.push(normalized);
    const result = database.prepare(`UPDATE allowlist SET ${sets.join(', ')} WHERE phone_number = ?`).run(...vals);
    refreshAllowlistCache();
    return result.changes > 0;
};

const getAllowlist = () => {
    const database = initDatabase();
    return database.prepare('SELECT * FROM allowlist ORDER BY added_at DESC').all();
};

const isPhoneAllowed = (phoneNumber) => {
    if (Date.now() - allowlistCacheTime > ALLOWLIST_CACHE_TTL) {
        try { refreshAllowlistCache(); } catch (e) { /* cache stale is ok */ }
    }
    const normalized = normalizePhoneNumber(phoneNumber);
    const entry = allowlistCache.get(normalized);
    return entry ? entry.is_active === 1 : false;
};

const getActiveAllowlistCount = () => {
    const database = initDatabase();
    const row = database.prepare('SELECT COUNT(*) as count FROM allowlist WHERE is_active = 1').get();
    return row.count;
};

// ═══════════════════════════════════════════════════════════
//  BOT CONFIG CRUD
// ═══════════════════════════════════════════════════════════

const setConfig = (key, value, description, type, updatedBy) => {
    const database = initDatabase();
    database.prepare(
        `INSERT INTO bot_config (config_key, config_value, description, config_type, updated_by)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(config_key) DO UPDATE SET
           config_value = excluded.config_value,
           description = COALESCE(excluded.description, bot_config.description),
           config_type = COALESCE(excluded.config_type, bot_config.config_type),
           updated_by = excluded.updated_by,
           updated_at = CURRENT_TIMESTAMP`
    ).run(key, String(value), description || null, type || 'string', updatedBy || null);
};

const getConfig = (key, defaultValue = null) => {
    const database = initDatabase();
    const row = database.prepare('SELECT config_value, config_type FROM bot_config WHERE config_key = ?').get(key);
    if (!row) return defaultValue;
    if (row.config_type === 'number') return Number(row.config_value);
    if (row.config_type === 'boolean') return row.config_value === 'true';
    return row.config_value;
};

const getAllConfigs = () => {
    const database = initDatabase();
    const rows = database.prepare('SELECT * FROM bot_config ORDER BY config_key').all();
    const obj = {};
    for (const row of rows) obj[row.config_key] = row.config_value;
    return obj;
};

const getAllConfigRows = () => {
    const database = initDatabase();
    return database.prepare('SELECT * FROM bot_config ORDER BY config_key').all();
};

const deleteConfig = (key) => {
    const database = initDatabase();
    return database.prepare('DELETE FROM bot_config WHERE config_key = ?').run(key).changes > 0;
};

const initDefaultConfigs = () => {
    const defaults = [
        ['copilot_api_model', process.env.COPILOT_API_MODEL || 'claude-sonnet-4-20250514', 'AI model name', 'string'],
        ['session_expiry_hours', String(process.env.SESSION_EXPIRY_HOURS || '24'), 'Session expiry in hours', 'number'],
        ['log_level', process.env.LOG_LEVEL || 'info', 'Log level', 'string'],
        ['bot_name', process.env.BOT_NAME || 'Tama', 'Bot display name', 'string'],
    ];
    const database = initDatabase();
    const stmt = database.prepare(
        `INSERT OR IGNORE INTO bot_config (config_key, config_value, description, config_type) VALUES (?, ?, ?, ?)`
    );
    for (const [k, v, d, t] of defaults) stmt.run(k, v, d, t);
};

// ═══════════════════════════════════════════════════════════
//  FEATURE TOGGLES CRUD
// ═══════════════════════════════════════════════════════════

let featureToggleCache = new Map();
let featureToggleCacheTime = 0;
const FEATURE_CACHE_TTL = 5 * 60 * 1000;

const refreshFeatureToggleCache = () => {
    const database = initDatabase();
    const rows = database.prepare('SELECT feature_id, is_enabled FROM feature_toggles').all();
    featureToggleCache.clear();
    for (const row of rows) featureToggleCache.set(row.feature_id, row.is_enabled === 1);
    featureToggleCacheTime = Date.now();
};

const setFeatureToggle = (featureId, isEnabled, disabledBy) => {
    const database = initDatabase();
    database.prepare(
        `INSERT INTO feature_toggles (feature_id, is_enabled, disabled_by, disabled_at, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(feature_id) DO UPDATE SET
           is_enabled = excluded.is_enabled,
           disabled_by = excluded.disabled_by,
           disabled_at = excluded.disabled_at,
           updated_at = CURRENT_TIMESTAMP`
    ).run(featureId, isEnabled ? 1 : 0, isEnabled ? null : (disabledBy || null), isEnabled ? null : new Date().toISOString());
    refreshFeatureToggleCache();
};

const getFeatureToggle = (featureId) => {
    const database = initDatabase();
    const row = database.prepare('SELECT * FROM feature_toggles WHERE feature_id = ?').get(featureId);
    return row || { feature_id: featureId, is_enabled: 1 };
};

const getAllFeatureToggles = () => {
    const database = initDatabase();
    const rows = database.prepare('SELECT * FROM feature_toggles').all();
    const obj = {};
    for (const row of rows) obj[row.feature_id] = row.is_enabled === 1;
    return obj;
};

const isFeatureEnabled = (featureId) => {
    if (!featureId) return true;
    if (Date.now() - featureToggleCacheTime > FEATURE_CACHE_TTL) {
        try { refreshFeatureToggleCache(); } catch (e) { /* stale ok */ }
    }
    const cached = featureToggleCache.get(featureId);
    return cached === undefined ? true : cached;
};

// ═══════════════════════════════════════════════════════════
//  ADMIN USERS CRUD
// ═══════════════════════════════════════════════════════════

const createAdminUser = (username, passwordHash, displayName, role) => {
    const database = initDatabase();
    const result = database.prepare(
        'INSERT INTO admin_users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)'
    ).run(username, passwordHash, displayName || username, role || 'admin');
    return { id: result.lastInsertRowid };
};

const getAdminByUsername = (username) => {
    const database = initDatabase();
    return database.prepare('SELECT * FROM admin_users WHERE username = ?').get(username) || null;
};

const getAdminById = (id) => {
    const database = initDatabase();
    return database.prepare('SELECT * FROM admin_users WHERE id = ?').get(id) || null;
};

const updateAdminLastLogin = (id) => {
    const database = initDatabase();
    database.prepare('UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(id);
};

const updateAdminPassword = (id, passwordHash) => {
    const database = initDatabase();
    database.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
};

const initDefaultAdmin = () => {
    const database = initDatabase();
    const count = database.prepare('SELECT COUNT(*) as c FROM admin_users').get();
    if (count.c > 0) return null;
    const username = process.env.DASHBOARD_ADMIN_USER || 'admin';
    const password = process.env.DASHBOARD_ADMIN_PASS || 'admin';
    try {
        const bcrypt = require('bcryptjs');
        const hash = bcrypt.hashSync(password, 12);
        return createAdminUser(username, hash, 'Administrator', 'admin');
    } catch (e) {
        console.error('[Database] Failed to create default admin:', e.message);
        return null;
    }
};

// ═══════════════════════════════════════════════════════════
//  ADMIN SESSIONS CRUD
// ═══════════════════════════════════════════════════════════

const createAdminSession = (adminId, sessionToken, ipAddress, userAgent, expiresAt) => {
    const database = initDatabase();
    const result = database.prepare(
        'INSERT INTO admin_sessions (admin_id, session_token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)'
    ).run(adminId, sessionToken, ipAddress || null, userAgent || null, expiresAt);
    return { id: result.lastInsertRowid };
};

const getAdminSession = (sessionToken) => {
    const database = initDatabase();
    return database.prepare(
        `SELECT s.*, u.username, u.display_name, u.role, u.is_active as admin_active
         FROM admin_sessions s
         JOIN admin_users u ON s.admin_id = u.id
         WHERE s.session_token = ? AND s.expires_at > datetime('now')`
    ).get(sessionToken) || null;
};

const deleteAdminSession = (sessionToken) => {
    const database = initDatabase();
    return database.prepare('DELETE FROM admin_sessions WHERE session_token = ?').run(sessionToken).changes > 0;
};

const cleanExpiredSessions = () => {
    const database = initDatabase();
    return database.prepare("DELETE FROM admin_sessions WHERE expires_at <= datetime('now')").run().changes;
};

// ═══════════════════════════════════════════════════════════
//  ACTIVITY LOGS CRUD
// ═══════════════════════════════════════════════════════════

const logActivity = (adminId, action, target, details, ipAddress) => {
    const database = initDatabase();
    database.prepare(
        'INSERT INTO activity_logs (admin_id, action, target, details, ip_address) VALUES (?, ?, ?, ?, ?)'
    ).run(adminId || null, action, target || null, details || null, ipAddress || null);
};

const getActivityLogs = (limit = 50, offset = 0) => {
    const database = initDatabase();
    return database.prepare(
        'SELECT l.*, u.username FROM activity_logs l LEFT JOIN admin_users u ON l.admin_id = u.id ORDER BY l.created_at DESC LIMIT ? OFFSET ?'
    ).all(limit, offset);
};

const getActivityLogsByAdmin = (adminId, limit = 50) => {
    const database = initDatabase();
    return database.prepare(
        'SELECT * FROM activity_logs WHERE admin_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(adminId, limit);
};

// ═══════════════════════════════════════════════════════════
//  VERIFICATION SOURCES CRUD
// ═══════════════════════════════════════════════════════════

const saveVerification = (chatId, messageId, query, sources, confidence, verified) => {
    const database = initDatabase();
    return database.prepare(
        'INSERT INTO verification_sources (chat_id, message_id, query, sources, confidence, verified) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(chatId, messageId || null, query || null, JSON.stringify(sources || []), confidence || 0, verified ? 1 : 0);
};

const getVerification = (chatId, messageId) => {
    const database = initDatabase();
    const row = database.prepare(
        'SELECT * FROM verification_sources WHERE chat_id = ? AND message_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(chatId, messageId);
    if (row && row.sources) row.sources = JSON.parse(row.sources);
    return row || null;
};

const getRecentVerifications = (chatId, limit = 10) => {
    const database = initDatabase();
    const rows = database.prepare(
        'SELECT * FROM verification_sources WHERE chat_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(chatId, limit);
    return rows.map(r => {
        if (r.sources) r.sources = JSON.parse(r.sources);
        return r;
    });
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
    scheduleRetentionCleanup,
    closeDatabase,
    // User preferences
    isOwner,
    getUserPreferences,
    saveUserPreference,
    getPreferredName,
    detectNicknamePreference,
    OWNER_NUMBERS,
    // Long-term memory
    saveMemory,
    searchMemory,
    getMemories,
    deleteMemory,
    // Reminders
    createReminder,
    getPendingReminders,
    getUserReminders,
    markReminderDone,
    deleteReminder,
    // Notes
    createNote,
    getUserNotes,
    searchNotes,
    updateNoteStatus,
    deleteNote,
    // Polls
    createPoll,
    getPoll,
    getActivePoll,
    votePoll,
    closePoll,
    getPollResults,
    // RSS feeds
    addRssFeed,
    getUserFeeds,
    updateFeedChecked,
    removeRssFeed,
    // Scheduled messages
    createScheduledMessage,
    getPendingScheduledMessages,
    markScheduledMessageSent,
    getUserScheduledMessages,
    // Allowlist
    normalizePhoneNumber,
    addToAllowlist,
    removeFromAllowlist,
    toggleAllowlist,
    updateAllowlistEntry,
    getAllowlist,
    isPhoneAllowed,
    refreshAllowlistCache,
    getActiveAllowlistCount,
    // Bot config
    setConfig,
    getConfig,
    getAllConfigs,
    getAllConfigRows,
    deleteConfig,
    initDefaultConfigs,
    // Feature toggles
    setFeatureToggle,
    getFeatureToggle,
    getAllFeatureToggles,
    isFeatureEnabled,
    refreshFeatureToggleCache,
    // Admin users
    createAdminUser,
    getAdminByUsername,
    getAdminById,
    updateAdminLastLogin,
    updateAdminPassword,
    initDefaultAdmin,
    // Admin sessions
    createAdminSession,
    getAdminSession,
    deleteAdminSession,
    cleanExpiredSessions,
    // Activity logs
    logActivity,
    getActivityLogs,
    getActivityLogsByAdmin,
    // Verification sources
    saveVerification,
    getVerification,
    getRecentVerifications,
    // Constants (for testing)
    RETENTION_MS,
    RETENTION_MONTHS,
    SESSION_EXPIRY_MS
};
