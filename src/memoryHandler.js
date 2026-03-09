/**
 * Memory Handler — long-term memory lintas sesi
 * 
 * Simpan, cari, dan inject memori jangka panjang ke percakapan.
 * Memori bertahan selamanya (bukan 24 jam).
 * 
 * @author Tama El Pablo
 */

const {
    saveMemory: dbSaveMemory,
    searchMemory: dbSearchMemory,
    getMemories: dbGetMemories,
    deleteMemory: dbDeleteMemory,
} = require('./database');

const VALID_CATEGORIES = ['preference', 'fact', 'event', 'lesson'];

/**
 * Simpan memori ke database
 */
const saveMemory = (userId, category, key, value) => {
    if (!userId || !key || !value) return { success: false, error: 'userId, key, dan value wajib diisi' };
    const cat = VALID_CATEGORIES.includes(category) ? category : 'fact';
    const result = dbSaveMemory(userId, cat, key.substring(0, 200), value.substring(0, 2000));
    return { success: true, ...result, category: cat, key, value };
};

/**
 * Cari memori
 */
const searchMemory = (userId, query) => {
    if (!query) return [];
    return dbSearchMemory(userId, query);
};

/**
 * List semua memori user
 */
const listMemories = (userId, category = null) => {
    const memories = dbGetMemories(userId, category);
    if (!memories.length) return 'belum ada memori yang disimpan bro 🧠';
    return memories.map((m, i) =>
        `${i + 1}. [${m.category}] ${m.key}: ${m.value}`
    ).join('\n');
};

/**
 * Hapus memori
 */
const deleteMemory = (userId, key) => {
    const deleted = dbDeleteMemory(userId, key);
    return deleted
        ? { success: true, message: `memori "${key}" udah dihapus ✅` }
        : { success: false, error: `memori "${key}" ga ketemu` };
};

/**
 * Ambil memori yang relevan dengan percakapan saat ini
 * Keyword matching sederhana dari conversationText
 */
const getRelevantMemories = (userId, conversationText) => {
    if (!conversationText || !userId) return [];
    const allMemories = dbGetMemories(userId);
    if (!allMemories.length) return [];

    const lower = conversationText.toLowerCase();
    const words = lower.split(/\s+/).filter(w => w.length > 2);

    const scored = allMemories.map(m => {
        let score = 0;
        const memText = `${m.key} ${m.value}`.toLowerCase();
        for (const word of words) {
            if (memText.includes(word)) score++;
        }
        // Preference and fact always get a small boost
        if (m.category === 'preference') score += 2;
        if (m.category === 'fact') score += 1;
        return { ...m, score };
    });

    return scored
        .filter(m => m.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
};

/**
 * Deteksi apakah user minta simpan memori
 */
const detectMemoryIntent = (text) => {
    if (!text) return null;
    const lower = text.toLowerCase();

    const patterns = [
        { regex: /(?:ingat(?:in|kan)?|remember|catat|simpan)\s*(?:ini|bahwa|:\s*)(.+)/i, category: 'fact' },
        { regex: /(?:jangan\s+lupa|dont\s+forget)\s*(?:bahwa|:\s*)(.+)/i, category: 'fact' },
        { regex: /(?:panggil\s+(?:aku|gw|gue|w|saya)|call\s+me)\s+(.+)/i, category: 'preference' },
        { regex: /(?:aku|gw|gue|w|saya)\s+(?:suka|seneng|demen|hobi)\s+(.+)/i, category: 'preference' },
        { regex: /(?:aku|gw|gue|w|saya)\s+(?:tinggal|rumah)\s+(?:di\s+)?(.+)/i, category: 'fact' },
        { regex: /(?:aku|gw|gue|w|saya)\s+(?:kerja|kuliah|sekolah)\s+(?:di\s+)?(.+)/i, category: 'fact' },
        { regex: /(?:nama\s+(?:aku|gw|gue|w|saya))\s+(.+)/i, category: 'fact' },
    ];

    for (const p of patterns) {
        const match = lower.match(p.regex);
        if (match && match[1]) {
            return { category: p.category, value: match[1].trim(), raw: text };
        }
    }
    return null;
};

/**
 * Auto-capture memori dari pola tertentu
 */
const autoCapture = (userId, text) => {
    if (!text || !userId) return null;
    const intent = detectMemoryIntent(text);
    if (!intent) return null;

    // Generate key from the value
    const key = intent.value.substring(0, 50).replace(/[^\w\s]/g, '').trim();
    if (!key) return null;

    const result = saveMemory(userId, intent.category, key, intent.value);
    return result.success ? result : null;
};

module.exports = {
    saveMemory,
    searchMemory,
    listMemories,
    deleteMemory,
    getRelevantMemories,
    detectMemoryIntent,
    autoCapture,
    VALID_CATEGORIES,
};
