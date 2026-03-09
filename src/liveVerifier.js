/**
 * Live Verifier — deteksi klaim faktual yang butuh verifikasi internet
 *
 * Analisis respon AI dan tentukan apakah perlu cross-check
 * dengan data internet terbaru untuk akurasi.
 *
 * @author Tama El Pablo
 */

// ═══════════════════════════════════════════════════════════
//  VERIFICATION CACHE (TTL 30 menit)
// ═══════════════════════════════════════════════════════════

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const verificationCache = new Map();

/**
 * Clean expired cache entries
 */
const cleanCache = () => {
    const now = Date.now();
    for (const [key, entry] of verificationCache) {
        if (now - entry.timestamp > CACHE_TTL) {
            verificationCache.delete(key);
        }
    }
};

// Clean cache every 10 minutes
setInterval(cleanCache, 10 * 60 * 1000).unref();

// ═══════════════════════════════════════════════════════════
//  DETECTION PATTERNS
// ═══════════════════════════════════════════════════════════

// Angka/statistik: tahun, persentase, jumlah penduduk, harga, skor
const STATISTICS_PATTERNS = [
    /\b\d{1,3}([.,]\d{3})+\b/,                           // large numbers: 1,000,000
    /\b\d+(\.\d+)?%/,                                     // percentages
    /\b(Rp|USD|\$|€|¥|IDR)\s?\d/i,                        // currency values
    /\b\d+\s?(juta|miliar|triliun|ribu|million|billion|trillion)\b/i,
    /\bskor\s?\d+\s?[-–]\s?\d+\b/i,                       // match scores
    /\bsensus\s+\d{4}/i,                                   // census year
    /\b(populasi|penduduk|populasi)\s+\d/i,
];

// Klaim temporal: "saat ini", "sekarang", "terbaru"
const TEMPORAL_PATTERNS = [
    /\b(saat ini|sekarang|saat tulisan ini|per \d{4}|hari ini|kemarin|baru.?baru ini)\b/i,
    /\b(terbaru|terkini|terupdate|update terakhir|data terbaru)\b/i,
    /\b(minggu ini|bulan ini|tahun ini|tahun \d{4})\b/i,
    /\b(currently|right now|as of|today|recently|latest)\b/i,
];

// Nama public figure + jabatan/posisi
const PERSON_INFO_PATTERNS = [
    /\b(presiden|perdana menteri|wakil presiden|gubernur|walikota|bupati|menteri)\b.*\b(indonesia|ri|jawa|sumatra|kalimantan|sulawesi)/i,
    /\b(CEO|CTO|CFO|founder|pendiri|ketua|chairman|direktur)\b.*\b(of|dari)\b/i,
    /\b(presiden|president)\s+(indonesia|ri|amerika|us|russia|china)/i,
];

// Versi software/teknologi
const TECH_VERSION_PATTERNS = [
    /\b(versi|version|ver\.?)\s*(terbaru|latest|terakhir|stable|lts)\b/i,
    /\b(node\.?js|python|react|vue|angular|php|java|kotlin|swift|rust|go)\s*v?\d+/i,
    /\b(update|release|rilis)\s+(terbaru|baru|latest)\b/i,
];

// Event terkini
const NEWS_EVENT_PATTERNS = [
    /\b(berita|news|kabar)\s+(terbaru|terkini|hari ini|viral)\b/i,
    /\b(baru.?baru ini|minggu ini|kemarin|tadi)\b.*(terjadi|happen|dilaporkan|announced)/i,
    /\b(trending|viral|gempar|heboh)\b/i,
];

// Harga/market data
const PRICE_PATTERNS = [
    /\b(harga|price|biaya|tarif|ongkos)\s+(bitcoin|btc|eth|emas|gold|saham|stock|minyak|oil)/i,
    /\b(bitcoin|btc|ethereum|eth|crypto|kripto)\s+(price|harga|saat ini|sekarang)/i,
    /\b(kurs|exchange rate|nilai tukar)\b/i,
    /\b(harga)\s+\w+\s+(hari ini|sekarang|terbaru)/i,
];

// Date/time event  
const DATE_TIME_EVENT_PATTERNS = [
    /\b(kapan|when)\s+(hari|tanggal|jadwal|schedule)/i,
    /\b(jadwal|schedule|agenda)\s+(pertandingan|match|event|acara)/i,
    /\b(hasil|result|skor|score)\s+(pertandingan|match|game)\b/i,
];

// ═══════════════════════════════════════════════════════════
//  SKIP PATTERNS (jangan verify)
// ═══════════════════════════════════════════════════════════

const SKIP_QUERY_PATTERNS = [
    // Opini/saran
    /\b(menurut\s*(gw|gue|w|aku|saya)|opini|pendapat|saran)\b/i,
    /\b(recommended|rekomendasiin|saranin|suggest)\b/i,
    // Curhat/emosi
    /\b(curhat|sedih|galau|baper|stress|capek|lelah|marah|senang)\b/i,
    /\b(perasaan|feeling|mood|hati)\b/i,
    // Small talk/greeting
    /^(hai|halo|hey|yo|hi|hello|hy|assalam|salam|pagi|siang|sore|malam)\b/i,
    /^(ok|oke|sip|siap|mantap|yoi|betul|bener)\b/i,
    // Coding help
    /\b(code|kode|program|debug|error|bug|syntax|compile|run)\b/i,
    /\b(function|class|method|variable|import|export|module)\b/i,
    // Humor
    /\b(jokes?|lucu|humor|receh|ngakak|wkwk)\b/i,
    // Personal advice
    /\b(gimana|bagaimana)\s+(caranya|cara)\s+(supaya|biar|agar)\b/i,
];

const SKIP_RESPONSE_PATTERNS = [
    // AI sedang memberikan opini/saran
    /\b(menurut\s*(gw|w|aku)|opini\s*(gw|w)|saran\s*(gw|w))\b/i,
    // Coding response
    /```[\s\S]{20,}```/,  // code blocks
    // Personal/emotional response
    /\b(semangat|sabar|tenang|jangan\s*sedih)\b/i,
];

// ═══════════════════════════════════════════════════════════
//  CORE: needsVerification
// ═══════════════════════════════════════════════════════════

/**
 * Detect apakah respon AI mengandung klaim yang perlu verifikasi internet
 *
 * @param {string} aiResponse - respon AI yang akan dianalisis
 * @param {string} userQuery - pertanyaan user yang memicu respon ini
 * @returns {{ needsCheck: boolean, checkType: string, searchQuery: string }}
 */
const needsVerification = (aiResponse, userQuery) => {
    if (!aiResponse || !userQuery) {
        return { needsCheck: false, checkType: '', searchQuery: '' };
    }

    // Skip kalau query user masuk kategori yang ga perlu verify
    for (const pattern of SKIP_QUERY_PATTERNS) {
        if (pattern.test(userQuery)) {
            return { needsCheck: false, checkType: '', searchQuery: '' };
        }
    }

    // Skip kalau response AI masuk kategori yang ga perlu verify
    for (const pattern of SKIP_RESPONSE_PATTERNS) {
        if (pattern.test(aiResponse)) {
            return { needsCheck: false, checkType: '', searchQuery: '' };
        }
    }

    // Check cache
    const cacheKey = `${userQuery.substring(0, 100)}`;
    const cached = verificationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.result;
    }

    const combined = `${aiResponse} ${userQuery}`;

    // Check setiap pattern type
    const checks = [
        { patterns: PRICE_PATTERNS, type: 'price_data' },
        { patterns: NEWS_EVENT_PATTERNS, type: 'news_event' },
        { patterns: STATISTICS_PATTERNS, type: 'statistics' },
        { patterns: TEMPORAL_PATTERNS, type: 'factual_claim' },
        { patterns: PERSON_INFO_PATTERNS, type: 'person_info' },
        { patterns: TECH_VERSION_PATTERNS, type: 'technical_version' },
        { patterns: DATE_TIME_EVENT_PATTERNS, type: 'date_time_event' },
    ];

    for (const { patterns, type } of checks) {
        for (const pattern of patterns) {
            if (pattern.test(combined)) {
                const searchQuery = generateSearchQuery(userQuery, type);
                const result = { needsCheck: true, checkType: type, searchQuery };

                // Cache result
                verificationCache.set(cacheKey, { result, timestamp: Date.now() });
                return result;
            }
        }
    }

    const result = { needsCheck: false, checkType: '', searchQuery: '' };
    verificationCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
};

// ═══════════════════════════════════════════════════════════
//  SEARCH QUERY GENERATION
// ═══════════════════════════════════════════════════════════

/**
 * Generate search query yang relevan berdasarkan user query dan check type
 */
const generateSearchQuery = (userQuery, checkType) => {
    // Clean up query — hapus kata yang ga perlu buat search
    let query = userQuery
        .replace(/^(tolong|bisa|minta|coba|bantuin|jelasin|kasih tau)\s+/i, '')
        .replace(/\b(dong|ya|yah|nih|sih|deh|gan|bro|bre|cuy|boss|king)\b/gi, '')
        .trim();

    // Tambahkan context berdasarkan check type
    switch (checkType) {
        case 'price_data':
            if (!/\b(harga|price|current|terbaru|sekarang|hari ini)\b/i.test(query)) {
                query += ' harga terbaru';
            }
            break;
        case 'news_event':
            if (!/\b(berita|news|terbaru|terkini)\b/i.test(query)) {
                query += ' berita terbaru';
            }
            break;
        case 'person_info':
            if (!/\b(siapa|who|saat ini|sekarang|current)\b/i.test(query)) {
                query += ' saat ini';
            }
            break;
        case 'technical_version':
            if (!/\b(versi|version|latest|terbaru|release)\b/i.test(query)) {
                query += ' latest version';
            }
            break;
        case 'date_time_event':
            if (!/\b(jadwal|schedule|kapan|when)\b/i.test(query)) {
                query += ' jadwal terbaru';
            }
            break;
    }

    // Limit panjang query
    return query.substring(0, 150);
};

/**
 * Get cached verification result
 */
const getCachedResult = (query) => {
    const cacheKey = `${query.substring(0, 100)}`;
    const cached = verificationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached;
    }
    return null;
};

/**
 * Clear verification cache
 */
const clearCache = () => {
    verificationCache.clear();
};

module.exports = {
    needsVerification,
    generateSearchQuery,
    getCachedResult,
    clearCache,
    cleanCache,
    // Exposed for testing
    STATISTICS_PATTERNS,
    TEMPORAL_PATTERNS,
    PERSON_INFO_PATTERNS,
    TECH_VERSION_PATTERNS,
    NEWS_EVENT_PATTERNS,
    PRICE_PATTERNS,
    DATE_TIME_EVENT_PATTERNS,
    SKIP_QUERY_PATTERNS,
    SKIP_RESPONSE_PATTERNS,
    CACHE_TTL,
};
