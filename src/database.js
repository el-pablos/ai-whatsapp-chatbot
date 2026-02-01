/**
 * Database Module - Chat Memory Storage
 * 
 * SQLite database untuk menyimpan conversation history per user
 * Unlimited context - semua chat disimpan dan dikirim ke AI
 * 
 * @author Tama (el-pablos)
 * @version 2.0.0
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database path
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'chat_memory.db');

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
 * 
 * @param {string} chatId - Chat ID (JID)
 * @param {number} limit - Max messages to retrieve (0 = unlimited)
 * @returns {Array} - Array of messages in OpenAI format
 */
const getConversationHistory = (chatId, limit = 0) => {
    const database = initDatabase();
    
    let query = `
        SELECT role, content, quoted_content, media_type, media_caption, sender_name, timestamp
        FROM conversations 
        WHERE chat_id = ?
        ORDER BY timestamp ASC
    `;
    
    if (limit > 0) {
        // Get last N messages
        query = `
            SELECT * FROM (
                SELECT role, content, quoted_content, media_type, media_caption, sender_name, timestamp
                FROM conversations 
                WHERE chat_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            ) ORDER BY timestamp ASC
        `;
        const stmt = database.prepare(query);
        const rows = stmt.all(chatId, limit);
        return formatMessagesForAI(rows);
    }
    
    const stmt = database.prepare(query);
    const rows = stmt.all(chatId);
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
    
    const totalMessages = database.prepare(`SELECT COUNT(*) as count FROM conversations`).get();
    const totalUsers = database.prepare(`SELECT COUNT(*) as count FROM user_profiles`).get();
    const totalChats = database.prepare(`SELECT COUNT(DISTINCT chat_id) as count FROM conversations`).get();
    
    return {
        totalMessages: totalMessages.count,
        totalUsers: totalUsers.count,
        totalChats: totalChats.count
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

module.exports = {
    initDatabase,
    saveMessage,
    getConversationHistory,
    getMessageById,
    getUserProfile,
    updateUserProfile,
    clearConversation,
    getStats,
    closeDatabase
};
