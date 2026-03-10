/**
 * Allowlist Manager — centralized allowlist control
 *
 * In-memory cache backed by SQLite. Used by:
 * - bot.js (message filter)
 * - dashboard API (web management)
 * - WhatsApp commands (/allow, /unallow, /allowlist)
 *
 * @author Tama El Pablo
 * @version 1.1.0
 */

const {
    addToAllowlist,
    removeFromAllowlist,
    toggleAllowlist,
    updateAllowlistEntry,
    getAllowlist,
    isPhoneAllowed,
    refreshAllowlistCache,
    getActiveAllowlistCount,
    getTotalAllowlistCount,
    normalizePhoneNumber,
    getConfig,
} = require('./database');
const { isOwnerPhone } = require('./userProfileHelper');
const { resolveToPhone, isLidJid } = require('./lidResolver');

/**
 * Normalize a JID or phone number to canonical format (628xxx digits only)
 * @param {string} jidOrPhone
 * @returns {string}
 */
const normalizePhone = (jidOrPhone) => {
    // Try lidResolver first (handles @lid)
    const resolved = resolveToPhone(jidOrPhone);
    if (resolved) return resolved;
    return normalizePhoneNumber(jidOrPhone);
};

/**
 * Check if a JID/phone is allowed to interact with the bot.
 *
 * Rules:
 * 1. Owner is ALWAYS allowed
 * 2. Check allowlist_mode config: 'open' = everyone, 'closed' = nobody, 'allowlist' = check list
 * 3. If no allowlist_mode config: legacy behavior (totalCount===0 = allow all)
 * 4. Unresolved @lid JIDs are BLOCKED when allowlist has entries (prevent bypass)
 *
 * @param {string} jid — full JID or phone number
 * @returns {boolean}
 */
const isAllowed = (jid) => {
    if (!jid) return false;

    // Owner is always allowed (lidResolver handles @lid→phone)
    if (isOwnerPhone(jid)) return true;

    // Check allowlist_mode: 'open' | 'closed' | 'allowlist' (default)
    let mode;
    try {
        mode = getConfig('allowlist_mode', 'allowlist');
    } catch {
        mode = 'allowlist';
    }

    if (mode === 'open') return true;
    if (mode === 'closed') return false;

    // Mode 'allowlist' — check the list
    try {
        const totalCount = getTotalAllowlistCount();
        if (totalCount === 0) return true; // backward compat: empty list = allow all
    } catch (e) {
        console.error('[Allowlist] DB error in isAllowed, blocking by default:', e.message);
        return false;
    }

    // Resolve phone from JID (handles @lid via lidResolver)
    const phone = resolveToPhone(jid);

    // If @lid and cannot resolve to phone → BLOCK (prevent allowlist bypass)
    if (!phone && isLidJid(jid)) {
        console.warn(`[Allowlist] Blocking unresolved LID: ${jid.split('@')[0]} — no phone mapping`);
        return false;
    }

    if (!phone) {
        // Non-LID JID that can't resolve (e.g. @g.us group) — fallback to raw extraction
        const raw = jid.split('@')[0].replace(/\D/g, '');
        return isPhoneAllowed(raw);
    }

    return isPhoneAllowed(phone);
};

/**
 * Add a number to the allowlist
 */
const addNumber = (phone, displayName, addedBy, notes) => {
    return addToAllowlist(phone, displayName, addedBy, notes);
};

/**
 * Remove a number from the allowlist
 */
const removeNumber = (phone) => {
    return removeFromAllowlist(phone);
};

/**
 * Toggle a number's active status
 */
const toggleNumber = (phone, isActive) => {
    return toggleAllowlist(phone, isActive);
};

/**
 * Get all allowlist entries
 */
const getAll = () => {
    return getAllowlist();
};

/**
 * Get allowlist stats
 */
const getStats = () => {
    const all = getAllowlist();
    const active = all.filter(e => e.is_active === 1).length;
    return { total: all.length, active, inactive: all.length - active };
};

/**
 * Refresh the in-memory cache
 */
const refreshCache = () => {
    refreshAllowlistCache();
};

module.exports = {
    normalizePhone,
    isAllowed,
    addNumber,
    removeNumber,
    toggleNumber,
    getAll,
    getStats,
    refreshCache,
};
