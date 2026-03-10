/**
 * LID Resolver — resolusi WhatsApp Link ID ke nomor telepon
 *
 * WhatsApp/Baileys 7.x menggunakan format JID @lid (Link ID)
 * yang berisi identifier internal, BUKAN nomor telepon. Modul ini
 * menjembatani antara LID dan phone number.
 *
 * Strategi resolusi (urut prioritas):
 * 1. In-memory cache (LID → phone mapping)
 * 2. SQLite persistent cache (tabel lid_phone_map)
 * 3. Baileys store contacts (jika tersedia)
 * 4. Fallback: return null (log warning)
 *
 * @author Tama El Pablo
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════
//  IN-MEMORY CACHE
// ═══════════════════════════════════════════════════════════

/** @type {Map<string, string>} LID user part → phone number (digits only) */
const lidToPhoneCache = new Map();

/** @type {Map<string, string>} phone number → LID user part (reverse lookup) */
const phoneToLidCache = new Map();

/** @type {Set<string>} LIDs already warned about — suppress repeat logs */
const _warnedLids = new Set();

// ═══════════════════════════════════════════════════════════
//  DETECTION
// ═══════════════════════════════════════════════════════════

/**
 * Check apakah JID menggunakan format @lid
 * @param {string} jid
 * @returns {boolean}
 */
const isLidJid = (jid) => {
    if (!jid || typeof jid !== 'string') return false;
    return jid.endsWith('@lid');
};

/**
 * Check apakah JID menggunakan format @s.whatsapp.net (phone-based)
 * @param {string} jid
 * @returns {boolean}
 */
const isPhoneJid = (jid) => {
    if (!jid || typeof jid !== 'string') return false;
    return jid.endsWith('@s.whatsapp.net');
};

/**
 * Extract user part dari JID (sebelum @)
 * @param {string} jid
 * @returns {string}
 */
const extractUser = (jid) => {
    if (!jid) return '';
    return jid.split('@')[0].split(':')[0]; // strip device suffix juga
};

// ═══════════════════════════════════════════════════════════
//  DATABASE PERSISTENT CACHE
// ═══════════════════════════════════════════════════════════

let _db = null;
let _dbInitialized = false;

/**
 * Initialize SQLite table untuk persistent LID-phone mapping.
 * Dipanggil sekali saat bot startup.
 *
 * @param {object} database — instance better-sqlite3 dari database.js
 */
const initLidDatabase = (database) => {
    if (_dbInitialized) return;
    _db = database;
    try {
        _db.exec(`
            CREATE TABLE IF NOT EXISTS lid_phone_map (
                lid_user TEXT PRIMARY KEY,
                phone_number TEXT NOT NULL,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Load existing mappings ke memory cache
        const rows = _db.prepare('SELECT lid_user, phone_number FROM lid_phone_map').all();
        for (const row of rows) {
            lidToPhoneCache.set(row.lid_user, row.phone_number);
            phoneToLidCache.set(row.phone_number, row.lid_user);
        }
        _dbInitialized = true;
        if (rows.length > 0) {
            console.log(`[LidResolver] Loaded ${rows.length} LID-phone mappings dari database`);
        }
    } catch (err) {
        console.error('[LidResolver] Gagal init database:', err.message);
    }
};

// ═══════════════════════════════════════════════════════════
//  MAPPING MANAGEMENT
// ═══════════════════════════════════════════════════════════

/**
 * Register mapping LID ↔ phone. Dipanggil saat:
 * - Bot menerima pesan (msg.key.remoteJid + state.creds.me)
 * - contacts.update event dari Baileys
 * - Manual assignment oleh owner
 *
 * @param {string} lidJid — full LID JID (xxx@lid) atau LID user part
 * @param {string} phoneJid — full phone JID (xxx@s.whatsapp.net) atau phone digits
 */
const registerMapping = (lidJid, phoneJid) => {
    if (!lidJid || !phoneJid) return;

    const lidUser = extractUser(lidJid);
    // Clean phone: strip @s.whatsapp.net, strip non-digits
    let phone = phoneJid.split('@')[0].replace(/\D/g, '');
    // Normalize 08xxx → 628xxx
    if (phone.startsWith('0')) phone = '62' + phone.slice(1);

    if (!lidUser || !phone || phone.length < 10) return;

    // Skip kalau mapping sudah sama
    if (lidToPhoneCache.get(lidUser) === phone) return;

    lidToPhoneCache.set(lidUser, phone);
    phoneToLidCache.set(phone, lidUser);

    // Persist ke database
    if (_db) {
        try {
            _db.prepare(
                `INSERT INTO lid_phone_map (lid_user, phone_number, updated_at)
                 VALUES (?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(lid_user) DO UPDATE SET
                   phone_number = excluded.phone_number,
                   updated_at = CURRENT_TIMESTAMP`
            ).run(lidUser, phone);
        } catch (err) {
            console.error(`[LidResolver] Gagal persist mapping ${lidUser} → ${phone}:`, err.message);
        }
    }

    console.log(`[LidResolver] Registered: ${lidUser}@lid → ${phone}`);
};

/**
 * Register mapping dari Baileys contacts.update / contacts.upsert event.
 *
 * @param {Array} contacts — array dari Baileys contacts
 */
const registerFromContacts = (contacts) => {
    if (!Array.isArray(contacts)) return;
    for (const contact of contacts) {
        if (!contact.id) continue;
        // Case 1: contact has separate lid and phone id fields
        if (contact.lid && isPhoneJid(contact.id)) {
            registerMapping(contact.lid, contact.id);
        }
        // Case 2: contact.id is @lid and contact has a phone/number field
        if (isLidJid(contact.id) && contact.phone) {
            registerMapping(contact.id, contact.phone);
        }
        // Case 3: contact.id is @lid and contact.notify contains phone hint (rare)
        // Case 4: cross-reference id and lid when both present
        if (contact.id && contact.lid && isLidJid(contact.id) && isPhoneJid(contact.lid)) {
            // Some Baileys versions swap these
            registerMapping(contact.id, contact.lid);
        }
    }
};

/**
 * Register mapping dari Baileys creds.me object.
 * creds.me memiliki { id: "xxx@s.whatsapp.net", lid: "xxx@lid" }
 *
 * @param {object} me — state.creds.me dari Baileys
 */
const registerFromMe = (me) => {
    if (!me) return;
    if (me.lid && me.id) {
        registerMapping(me.lid, me.id);
    }
};

// ═══════════════════════════════════════════════════════════
//  RESOLUTION — FUNGSI UTAMA
// ═══════════════════════════════════════════════════════════

/**
 * Resolve JID ke nomor telepon (digits only, format 628xxx).
 *
 * Kalau JID sudah format @s.whatsapp.net → langsung extract phone.
 * Kalau JID format @lid → cari mapping, return phone kalau ketemu.
 * Kalau mapping tidak ada → return null (BUKAN return LID!).
 *
 * @param {string} jid — full JID (xxx@lid atau xxx@s.whatsapp.net)
 * @returns {string|null} phone number digits atau null kalau tidak bisa resolve
 */
const resolveToPhone = (jid) => {
    if (!jid) return null;

    // Kalau sudah format phone JID → extract langsung
    if (isPhoneJid(jid) || jid.endsWith('@c.us')) {
        let phone = jid.split('@')[0].replace(/\D/g, '');
        if (phone.startsWith('0')) phone = '62' + phone.slice(1);
        return phone || null;
    }

    // Kalau format @lid → cari mapping
    if (isLidJid(jid)) {
        const lidUser = extractUser(jid);
        const phone = lidToPhoneCache.get(lidUser);
        if (phone) return phone;

        // Tidak ada mapping — log warning ONCE per LID (suppress spam)
        if (!_warnedLids.has(lidUser)) {
            _warnedLids.add(lidUser);
            console.warn(`[LidResolver] Tidak bisa resolve LID ${lidUser} ke phone — mapping belum terdaftar`);
        }
        return null;
    }

    // Group JID (@g.us) — return null, bukan phone
    if (jid.endsWith('@g.us') || jid.endsWith('@broadcast')) {
        return null;
    }

    // Raw digits (tanpa @suffix)
    const cleaned = jid.replace(/\D/g, '');
    if (cleaned.length >= 10) {
        let phone = cleaned;
        if (phone.startsWith('0')) phone = '62' + phone.slice(1);
        return phone;
    }

    return null;
};

/**
 * Resolve JID ke nomor telepon, dengan fallback ke LID number.
 * WARNING: Hasil fallback BUKAN phone number — jangan pakai untuk allowlist lookup.
 *
 * @param {string} jid
 * @returns {string} phone number atau LID user part (never null, never empty)
 */
const resolveToPhoneOrLid = (jid) => {
    const phone = resolveToPhone(jid);
    if (phone) return phone;
    const user = extractUser(jid);
    return user || jid || 'unknown';
};

/**
 * Check apakah JID bisa di-resolve ke phone number.
 * @param {string} jid
 * @returns {boolean}
 */
const canResolve = (jid) => resolveToPhone(jid) !== null;

/**
 * Get total mapping count (untuk diagnostics)
 * @returns {number}
 */
const getMappingCount = () => lidToPhoneCache.size;

/**
 * Get semua mappings (untuk diagnostics/dashboard)
 * @returns {Array<{lid: string, phone: string}>}
 */
const getAllMappings = () => {
    const result = [];
    for (const [lid, phone] of lidToPhoneCache) {
        result.push({ lid, phone });
    }
    return result;
};

/**
 * Clear all in-memory caches (untuk testing)
 */
const _clearCache = () => {
    lidToPhoneCache.clear();
    phoneToLidCache.clear();
};

module.exports = {
    isLidJid,
    isPhoneJid,
    extractUser,
    initLidDatabase,
    registerMapping,
    registerFromContacts,
    registerFromMe,
    resolveToPhone,
    resolveToPhoneOrLid,
    canResolve,
    getMappingCount,
    getAllMappings,
    _clearCache,
};
