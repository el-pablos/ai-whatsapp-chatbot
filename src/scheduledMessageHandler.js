/**
 * Scheduled Message Handler — kirim pesan terjadwal
 * Owner-only untuk kirim ke chat lain
 * 
 * @author Tama El Pablo
 */

const {
    createScheduledMessage: dbCreateScheduled,
    getPendingScheduledMessages: dbGetPending,
    markScheduledMessageSent: dbMarkSent,
    getUserScheduledMessages: dbGetUserScheduled,
} = require('./database');
const { parseTimeString } = require('./reminderHandler');
const { isAllowed } = require('./allowlistManager');

/**
 * Jadwalkan pesan
 * @param {string} userId — JID user
 * @param {string} targetChatId — JID tujuan (chat yg sama atau chat lain jika owner)
 * @param {string} messageText — pesan yg mau dikirim
 * @param {string} timeStr — waktu natural language
 * @param {boolean} isOwner — apakah user adalah owner
 * @returns {{ success: boolean, message: string }}
 */
const scheduleMessage = (userId, targetChatId, messageText, timeStr, isOwner) => {
    if (!messageText) return { success: false, message: 'Pesan nya apa bro?' };
    if (!timeStr) return { success: false, message: 'Kapan mau dikirim? contoh: "besok jam 10"' };

    // Hanya owner yg bisa schedule ke chat lain
    if (targetChatId !== userId && !isOwner) {
        return { success: false, message: 'Cuma owner yg bisa jadwalkan pesan ke chat lain' };
    }

    const sendAt = parseTimeString(timeStr);
    if (!sendAt) return { success: false, message: `Ga paham format waktunya bro. Contoh: "jam 3 sore", "besok jam 10", "30 menit lagi"` };

    if (sendAt <= new Date()) {
        return { success: false, message: 'Waktu kirim harus di masa depan bro' };
    }

    const result = dbCreateScheduled(userId, targetChatId, messageText, sendAt.toISOString());
    return {
        success: true,
        message: `✅ Pesan dijadwalkan #${result.id}\n📤 Ke: ${targetChatId}\n⏰ Kirim: ${formatScheduleTime(sendAt)}\n💬 "${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}"`,
    };
};

/**
 * List pesan terjadwal user
 * @param {string} userId
 * @returns {string}
 */
const listScheduledMessages = (userId) => {
    const messages = dbGetUserScheduled(userId);
    if (!messages.length) return 'Belum ada pesan terjadwal bro ⏰';

    return '⏰ *Pesan Terjadwal:*\n' + messages.map((m, i) => {
        const sendAt = new Date(m.send_at);
        const status = m.status === 'sent' ? '✅' : '⏳';
        return `${status} [#${m.id}] ${formatScheduleTime(sendAt)}\n   → ${m.target_chat_id}\n   💬 "${m.message_text.substring(0, 60)}${m.message_text.length > 60 ? '...' : ''}"`;
    }).join('\n');
};

/**
 * Process pending scheduled messages — dipanggil tiap menit dari cron
 * @param {Function} sendMessage — async (chatId, text) => void
 * @returns {Promise<number>} — jumlah pesan yg dikirim
 */
const processPendingMessages = async (sendMessage) => {
    const pending = dbGetPending();
    let sent = 0;

    for (const msg of pending) {
        try {
            // Skip if target was removed from allowlist
            if (!isAllowed(msg.target_chat_id)) {
                dbMarkSent(msg.id);
                console.log(`[SCHEDULED] Skipped #${msg.id} — ${msg.target_chat_id} not in allowlist`);
                continue;
            }
            await sendMessage(msg.target_chat_id, msg.message_text);
            dbMarkSent(msg.id);
            sent++;
        } catch (err) {
            console.error(`[SCHEDULED] Gagal kirim pesan #${msg.id}:`, err.message);
        }
    }

    return sent;
};

/**
 * Parse command /schedule
 * @param {string} text — "/schedule jam 10 besok | pesan nya ini"
 * @returns {{ time: string, message: string, target?: string } | null}
 */
const parseScheduleCommand = (text) => {
    if (!text) return null;

    // /schedule list
    if (/^\/schedule\s+list$/i.test(text)) return { action: 'list' };

    // /schedule [time] | [message] | [target]
    const match = text.match(/^\/schedule\s+(.+)$/is);
    if (!match) return null;

    const parts = match[1].split('|').map(s => s.trim());
    if (parts.length < 2) return null;

    return {
        action: 'create',
        time: parts[0],
        message: parts[1],
        target: parts[2] || null,
    };
};

/**
 * Format waktu buat display
 */
const formatScheduleTime = (date) => {
    return date.toLocaleString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
    });
};

module.exports = {
    scheduleMessage,
    listScheduledMessages,
    processPendingMessages,
    parseScheduleCommand,
    formatScheduleTime,
};
