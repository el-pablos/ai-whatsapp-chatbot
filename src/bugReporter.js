/**
 * Bug Reporter Module
 * 
 * Automatically reports errors/bugs to the owner via WhatsApp
 * when they occur during bot operation.
 * 
 * @author Tama El Pablo
 */

// Owner's WhatsApp JID for bug reports
const OWNER_JID = `${process.env.BUG_REPORT_OWNER || '6285817378442'}@s.whatsapp.net`;

// Cooldown tracking to avoid spam (same error within 5 minutes)
const reportedBugs = new Map();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const DEP_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour for dependency-missing errors

/**
 * Check if an error is a missing system dependency (not a code bug)
 */
const isDependencyMissing = (errorMessage) => {
    if (!errorMessage) return false;
    const patterns = [
        /(libreoffice|soffice|ffmpeg|yt-dlp|pdftotext|ebook-convert|calibre|pandoc|djvutxt|unrar|unzip|7z|tar|zcat|curl|pip3): not found/i,
        /command not found/i,
        /exit code 127/i,
        /ENOENT.*(?:libreoffice|soffice|ffmpeg|yt-dlp|pdftotext|ebook-convert|djvutxt|unrar|7z)/i,
        /install unrar to see contents/i,
        /install p7zip to see contents/i,
        /install calibre/i,
        /install djvulibre/i,
        /install poppler/i,
        /install libreoffice/i,
    ];
    return patterns.some(p => p.test(errorMessage));
};

/**
 * Send a bug report to the owner via WhatsApp
 * Also notifies the user that the bug has been reported
 * 
 * @param {Object} sock - Baileys socket instance
 * @param {string} sender - The user's JID who triggered the bug
 * @param {string} pushName - User's display name
 * @param {Error|string} error - The error object or message
 * @param {string} context - Where the error occurred (e.g., 'media processing', 'AI response')
 * @param {Object} [msg] - Original message object for quoting
 */
const reportBugToOwner = async (sock, sender, pushName, error, context, msg = null) => {
    if (!sock) return;

    const errorMessage = typeof error === 'string' ? error : (error?.message || 'Unknown error');
    const errorStack = typeof error === 'object' ? (error?.stack || '') : '';
    const isDepMissing = isDependencyMissing(errorMessage);

    // Cooldown check - don't spam same error
    // Use longer cooldown (1 hour) for dependency-missing to avoid spam
    const cooldown = isDepMissing ? DEP_COOLDOWN_MS : COOLDOWN_MS;
    const bugKey = `${context}:${errorMessage}`;
    const lastReported = reportedBugs.get(bugKey);
    if (lastReported && Date.now() - lastReported < cooldown) {
        console.log(`[BugReport] Skipping duplicate report (cooldown): ${bugKey}`);
        return;
    }
    reportedBugs.set(bugKey, Date.now());

    // Clean up old entries periodically
    if (reportedBugs.size > 100) {
        const now = Date.now();
        for (const [key, time] of reportedBugs) {
            if (now - time > COOLDOWN_MS) reportedBugs.delete(key);
        }
    }

    const timestamp = new Date().toLocaleString('id-ID', { 
        timeZone: 'Asia/Jakarta',
        dateStyle: 'medium',
        timeStyle: 'medium'
    });

    // Format report differently for dependency-missing vs real bugs
    let bugReport, userNotification;

    if (isDepMissing) {
        // --- Dependency missing: NOT a code bug ---
        bugReport = `⚠️ *MISSING DEPENDENCY on server*

🔧 *Dependency:* ${errorMessage}

📍 *Context:* ${context}
👤 *User:* ${pushName} (${sender.replace('@s.whatsapp.net', '')})
🕐 *Waktu:* ${timestamp}

_Install yang dibutuhkan di server lalu restart bot._`;

        userNotification = `⚠️ Fitur ini butuh software tambahan di server yang belum ter-install.

*Info:* _${errorMessage}_

💡 *Solusi:* Admin perlu install dependency yang dibutuhkan di server. Laporan otomatis sudah dikirim ke owner. 🔧`;
    } else {
        // --- Real bug ---
        bugReport = `wet w nemu bug, w lapor king Tama dulu ya 🐛

*🔴 BUG REPORTED:* ${errorMessage}

📍 *Context:* ${context}
👤 *User:* ${pushName} (${sender.replace('@s.whatsapp.net', '')})
🕐 *Waktu:* ${timestamp}
${errorStack ? `\n📋 *Stack Trace:*\n\`\`\`\n${errorStack.substring(0, 500)}\n\`\`\`` : ''}

_*⚠️ broadcast message dont reply, reporting to owner*_`;

        userNotification = `😓 waduh error nih bro, tapi tenang w udah otomatis laporin bug nya ke owner buat di fix 🔧

*🐛 Bug:* _${errorMessage}_

📨 _Laporan lagi dikirim ke owner..._
💡 *Tips:* kalo bisa, confirm juga ke owner langsung biar dia cepet notice dan fix bug nya ya! 🙏`;
    }

    try {
        // Send bug report to owner
        await sock.sendMessage(OWNER_JID, { text: bugReport });
        console.log(`[BugReport] Bug reported to owner: ${errorMessage}`);
    } catch (reportError) {
        console.error('[BugReport] Failed to send bug report to owner:', reportError.message);
    }

    try {
        // Notify the user
        const sendOptions = msg ? { quoted: msg } : {};
        await sock.sendMessage(sender, { text: userNotification }, sendOptions);
        console.log(`[BugReport] User ${pushName} notified about bug report`);
    } catch (notifyError) {
        console.error('[BugReport] Failed to notify user:', notifyError.message);
    }
};

/**
 * Clean up cooldown cache
 */
const clearBugCooldowns = () => {
    reportedBugs.clear();
};

module.exports = {
    reportBugToOwner,
    clearBugCooldowns,
    isDependencyMissing,
    OWNER_JID
};
