/**
 * User Profile Helper — centralized user classification
 *
 * Determines whether the sender is:
 *  - an Owner  (hardcoded phone numbers)
 *  - "Salsa"   (pushName contains "salsa", case-insensitive)
 *  - a regular user
 *
 * Returns a `profileStyle` string that the AI layer injects into the
 * system-level context so the persona adjusts its tone.
 *
 * @author Tama El Pablo
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════
// OWNER PHONE NUMBERS (canonical, digits only, with 62 prefix)
// ═══════════════════════════════════════════════════════════
const OWNER_PHONES = [
    '6282210819939',
    '6285817378442',
];

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Strip JID suffix and non-digit characters to get a clean phone number.
 * Works for `@s.whatsapp.net`, `@lid`, `@g.us`, raw numbers, etc.
 *
 * @param {string} jidOrPhone
 * @returns {string} digits-only phone number
 */
const normalizePhone = (jidOrPhone) => {
    if (!jidOrPhone) return '';
    // Remove everything after @ (JID suffix), then keep only digits
    return jidOrPhone.split('@')[0].replace(/\D/g, '');
};

/**
 * Check whether a JID / phone number belongs to an owner.
 *
 * Handles:
 *  - full JID  `6282210819939@s.whatsapp.net`
 *  - with 0    `082210819939`
 *  - raw       `82210819939`
 *
 * @param {string} jidOrPhone
 * @returns {boolean}
 */
const isOwnerPhone = (jidOrPhone) => {
    const cleaned = normalizePhone(jidOrPhone);
    if (!cleaned) return false;

    return OWNER_PHONES.some(owner => {
        // Exact match
        if (cleaned === owner) return true;
        // Caller used 0-prefix → compare last N digits
        const ownerCore = owner.replace(/^62/, '');
        const cleanedCore = cleaned.replace(/^62/, '').replace(/^0/, '');
        return cleanedCore === ownerCore;
    });
};

/**
 * Check whether a display name contains "Salsa" (case-insensitive).
 *
 * @param {string} pushName — WhatsApp pushName / contact name
 * @returns {boolean}
 */
const isSalsaName = (pushName) => {
    if (!pushName || typeof pushName !== 'string') return false;
    return /salsa/i.test(pushName);
};

// ═══════════════════════════════════════════════════════════
// PROFILE CLASSIFICATION
// ═══════════════════════════════════════════════════════════

/**
 * Classify a sender into { isOwner, isSalsa, mode } and return a
 * context hint string for the AI prompt.
 *
 * Modes:
 *  - 'owner_salsa' — owner whose name is Salsa (combined style)
 *  - 'owner'       — owner (warm, respectful-casual)
 *  - 'salsa'       — non-owner named Salsa (extra friendly)
 *  - 'normal'      — regular user
 *
 * @param {string} jidOrPhone — sender JID or phone
 * @param {string} pushName   — WhatsApp display name
 * @returns {{ isOwner: boolean, isSalsa: boolean, mode: string, contextHint: string }}
 */
const classifyUser = (jidOrPhone, pushName) => {
    const owner = isOwnerPhone(jidOrPhone);
    const salsa = isSalsaName(pushName);

    let mode = 'normal';
    let contextHint = '';

    if (owner && salsa) {
        mode = 'owner_salsa';
        contextHint =
            '[OWNER: true] [SPECIAL_USER: Salsa] ' +
            'Ini owner kamu sekaligus Salsa. ' +
            'Gaya bicara: lebih personal, akrab, hangat, luwes, santai banget kayak ngobrol sama orang terdekat. ' +
            'Boleh panggil "king", "sayang", atau panggilan akrab lain yang natural. ' +
            'Tetap hormat tapi sangat dekat dan fleksibel.';
    } else if (owner) {
        mode = 'owner';
        contextHint =
            '[OWNER: true] ' +
            'Ini owner/pencipta kamu (Tama El Pablo atau co-owner). ' +
            'Gaya bicara: lebih personal, akrab, hangat, dan luwes dibanding user biasa. ' +
            'Boleh panggil "king", "boss", atau panggilan akrab owner. ' +
            'Tetap hormat tapi sangat santai dan fleksibel.';
    } else if (salsa) {
        mode = 'salsa';
        contextHint =
            '[SPECIAL_USER: Salsa] ' +
            'User ini bernama Salsa. ' +
            'Gaya bicara: lebih akrab, luwes, enak diajak ngobrol, sedikit lebih hangat dari user biasa. ' +
            'Tetap natural, jangan berlebihan atau dibuat-buat.';
    }

    return { isOwner: owner, isSalsa: salsa, mode, contextHint };
};

module.exports = {
    OWNER_PHONES,
    normalizePhone,
    isOwnerPhone,
    isSalsaName,
    classifyUser,
};
