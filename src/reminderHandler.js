/**
 * Reminder Handler — sistem pengingat berbasis waktu
 * 
 * Parse waktu natural language Indonesia, simpan ke SQLite,
 * dan kirim notifikasi via cron job setiap menit.
 * 
 * @author Tama El Pablo
 */

const cron = require('node-cron');
const { isAllowed } = require('./allowlistManager');
const {
    createReminder: dbCreateReminder,
    getPendingReminders,
    getUserReminders,
    markReminderDone,
    deleteReminder: dbDeleteReminder,
} = require('./database');

/**
 * Parse waktu dari teks natural language Indonesia
 * @param {string} timeString - "jam 3 sore", "besok jam 10", "30 menit lagi", "tanggal 15 jam 10"
 * @returns {Date|null}
 */
const parseTimeString = (timeString) => {
    if (!timeString) return null;
    const now = new Date();
    const lower = timeString.toLowerCase().trim();

    // "X menit lagi" / "X jam lagi"
    const relMatch = lower.match(/(\d+)\s*(menit|jam|detik|hari)\s+(lagi|kemudian|kedepan)/);
    if (relMatch) {
        const amount = parseInt(relMatch[1], 10);
        const unit = relMatch[2];
        const result = new Date(now);
        if (unit === 'menit') result.setMinutes(result.getMinutes() + amount);
        else if (unit === 'jam') result.setHours(result.getHours() + amount);
        else if (unit === 'detik') result.setSeconds(result.getSeconds() + amount);
        else if (unit === 'hari') result.setDate(result.getDate() + amount);
        return result;
    }

    // Parse jam (absolute) - "jam 3 sore", "jam 10 pagi", "jam 15", "pukul 8"
    let hour = null, minute = 0;
    const jamMatch = lower.match(/(?:jam|pukul)\s*(\d{1,2})(?::(\d{2})|\.(\d{2}))?/);
    if (jamMatch) {
        hour = parseInt(jamMatch[1], 10);
        minute = parseInt(jamMatch[2] || jamMatch[3] || '0', 10);
        if (lower.includes('sore') || lower.includes('malam')) {
            if (hour < 12) hour += 12;
        } else if (lower.includes('pagi') && hour === 12) {
            hour = 0;
        }
    }

    // "besok jam X"
    if (lower.includes('besok') && hour !== null) {
        const result = new Date(now);
        result.setDate(result.getDate() + 1);
        result.setHours(hour, minute, 0, 0);
        return result;
    }

    // "lusa jam X"
    if (lower.includes('lusa') && hour !== null) {
        const result = new Date(now);
        result.setDate(result.getDate() + 2);
        result.setHours(hour, minute, 0, 0);
        return result;
    }

    // "tanggal X jam Y"
    const tglMatch = lower.match(/(?:tanggal|tgl)\s*(\d{1,2})/);
    if (tglMatch) {
        const day = parseInt(tglMatch[1], 10);
        const result = new Date(now);
        result.setDate(day);
        if (hour !== null) result.setHours(hour, minute, 0, 0);
        else result.setHours(9, 0, 0, 0);
        // If date already passed this month, go to next month
        if (result <= now) result.setMonth(result.getMonth() + 1);
        return result;
    }

    // Jam hari ini
    if (hour !== null) {
        const result = new Date(now);
        result.setHours(hour, minute, 0, 0);
        if (result <= now) result.setDate(result.getDate() + 1);
        return result;
    }

    return null;
};

/**
 * Buat reminder baru
 */
const createReminder = (userId, chatId, message, timeString) => {
    const remindAt = parseTimeString(timeString);
    if (!remindAt) return { success: false, error: 'Ga bisa parse waktu nya bro. Coba format kayak "jam 3 sore" atau "30 menit lagi"' };
    if (!message || !message.trim()) return { success: false, error: 'Pesan reminder nya kosong bro' };

    const remindAtStr = remindAt.toISOString().replace('T', ' ').substring(0, 19);
    const result = dbCreateReminder(userId, chatId, message.trim(), remindAtStr);
    return {
        success: true,
        id: result.id,
        message: message.trim(),
        remindAt,
        formatted: formatRemindAt(remindAt),
    };
};

/**
 * Format waktu reminder jadi string yang enak dibaca
 */
const formatRemindAt = (date) => {
    const options = { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: false };
    return date.toLocaleDateString('id-ID', options);
};

/**
 * List semua reminder pending
 */
const listReminders = (userId) => {
    const reminders = getUserReminders(userId);
    if (!reminders.length) return 'belum ada reminder bro 🔔';
    return reminders.map((r, i) =>
        `${i + 1}. [ID:${r.id}] ${r.message} — ${r.remind_at}`
    ).join('\n');
};

/**
 * Hapus reminder
 */
const deleteReminder = (userId, reminderId) => {
    const deleted = dbDeleteReminder(userId, reminderId);
    return deleted
        ? { success: true, message: `reminder #${reminderId} udah dihapus ✅` }
        : { success: false, error: `reminder #${reminderId} ga ketemu bro` };
};

/**
 * Format pesan reminder yang dikirim ke user
 */
const formatReminderMessage = (reminder) => {
    return `🔔 *REMINDER!*\n\n${reminder.message}\n\n_reminder yang lu set sebelumnya_`;
};

/**
 * Start cron job: cek pending reminders tiap menit
 */
const startReminderCron = (sock) => {
    cron.schedule('* * * * *', async () => {
        try {
            const pending = getPendingReminders();
            for (const reminder of pending) {
                try {
                    // Skip if user was removed from allowlist
                    if (!isAllowed(reminder.chat_id)) {
                        markReminderDone(reminder.id);
                        console.log(`[Reminder] Skipped #${reminder.id} — ${reminder.chat_id} not in allowlist`);
                        continue;
                    }
                    await sock.sendMessage(reminder.chat_id, {
                        text: formatReminderMessage(reminder),
                    });
                    markReminderDone(reminder.id);
                } catch (err) {
                    console.error(`[Reminder] Failed to send reminder #${reminder.id}:`, err.message);
                }
            }
        } catch (err) {
            console.error('[Reminder] Cron error:', err.message);
        }
    });
    console.log('[Reminder] Cron started — checking every minute');
};

module.exports = {
    createReminder,
    listReminders,
    deleteReminder,
    parseTimeString,
    formatReminderMessage,
    formatRemindAt,
    startReminderCron,
};
