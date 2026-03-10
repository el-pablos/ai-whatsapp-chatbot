/**
 * Allowlist Manager — centralized allowlist control
 *
 * In-memory cache backed by SQLite. Used by:
 * - bot.js (message filter)
 * - dashboard API (web management)
 * - WhatsApp commands (/allow, /unallow, /allowlist)
 *
 * @author Tama El Pablo
 * @version 1.0.0
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
} = require('./database');
const { isOwnerPhone } = require('./userProfileHelper');

/**
 * Normalize a JID or phone number to canonical format (628xxx digits only)
 * @param {string} jidOrPhone
 * @returns {string}
 */
const normalizePhone = (jidOrPhone) => {
    return normalizePhoneNumber(jidOrPhone);
};

/**
 * Check if a JID/phone is allowed to interact with the bot.
 *
 * Rules:
 * 1. Owner is ALWAYS allowed
 * 2. If allowlist is empty (0 active entries), everyone is allowed (backward compat)
 * 3. Otherwise, only entries in allowlist with is_active=1 are allowed
 * 4. Group JIDs (@g.us) — check if group itself is in allowlist
 *
 * @param {string} jid — full JID or phone number
 * @returns {boolean}
 */
const isAllowed = (jid) => {
    if (!jid) return false;

    // Owner is always allowed
    if (isOwnerPhone(jid)) return true;

    // If allowlist has no entries at all, allow everyone (backward compat)
    try {
        const totalCount = getTotalAllowlistCount();
        if (totalCount === 0) return true;
    } catch (e) {
        // If DB error, BLOCK to prevent bypass
        console.error('[Allowlist] DB error in isAllowed, blocking by default:', e.message);
        return false;
    }

    // Extract phone from JID
    const phone = jid.split('@')[0].replace(/\D/g, '');
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
