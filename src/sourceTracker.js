/**
 * Source Tracker — melacak sumber informasi untuk setiap respon
 *
 * Simpan dan retrieve sumber verifikasi yang dipakai untuk respon AI.
 *
 * @author Tama El Pablo
 */

const { saveVerification, getVerification, getRecentVerifications } = require('./database');

/**
 * Track verification sources for a response
 *
 * @param {string} chatId - chat ID
 * @param {string} messageId - message ID
 * @param {object} verificationData
 * @param {string} verificationData.query - search query used
 * @param {string[]} verificationData.sources - source names/URLs
 * @param {number} verificationData.confidence - confidence score 0-1
 * @param {boolean} verificationData.verified - whether response was verified
 */
const trackSource = (chatId, messageId, verificationData = {}) => {
    try {
        saveVerification(
            chatId,
            messageId,
            verificationData.query || '',
            verificationData.sources || [],
            verificationData.confidence || 0,
            verificationData.verified || false,
        );
    } catch (err) {
        console.error('[SourceTracker] Failed to save:', err.message);
    }
};

/**
 * Get sources for a specific message
 */
const getSources = (chatId, messageId) => {
    try {
        return getVerification(chatId, messageId);
    } catch (err) {
        console.error('[SourceTracker] Failed to get:', err.message);
        return null;
    }
};

/**
 * Get recent verification history for a chat
 */
const getRecentSources = (chatId, limit = 10) => {
    try {
        return getRecentVerifications(chatId, limit);
    } catch (err) {
        console.error('[SourceTracker] Failed to get recent:', err.message);
        return [];
    }
};

module.exports = {
    trackSource,
    getSources,
    getRecentSources,
};
