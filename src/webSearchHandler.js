/**
 * Web Search Handler Module
 * 
 * Fitur:
 * - Web search menggunakan DuckDuckGo (free, no API key)
 * - Extract relevant info dari search results
 * - Format hasil untuk chat
 * - FIXED v2: Comprehensive NO-SEARCH GUARD to prevent false positive triggers
 * 
 * @author Tama El Pablo
 * @version 2.0.0 - Major fix for auto-search bug
 */

const axios = require('axios');

// DuckDuckGo Instant Answer API (free)
const DDG_API = 'https://api.duckduckgo.com/';

// ═══════════════════════════════════════════════════════════
// NO-SEARCH GUARD - HARD BLOCK PATTERNS (highest priority)
// These will NEVER trigger search, no matter what
// ═══════════════════════════════════════════════════════════

// Greetings - never search
const GREETING_PATTERNS = [
    /^(hai|halo|hey|yo|hi|hello|hy|hii|haloo|hallo|assalam|assalamualaikum|salam|pagi|siang|sore|malam|morning|evening)/i,
    /^(gm|gn|good\s*(morning|night|evening|afternoon))/i,
    /^(met\s*(pagi|siang|sore|malam))/i
];

// Acknowledgements - never search  
const ACK_PATTERNS = [
    /^(ok|oke|okey|okay|sip|siap|mantap|gas|bet|iya|yep|yup|yoi|yoa|yow|yes|ya|ye)\b/i,
    /^(amin|aminn|aminnn|makasih|thanks|thx|tq|ty|thank you|terima\s*kasih)\b/i,
    /^(nah|noh|wah|dah|udah|sudah|done|selesai|kelar)\b/i,
    /^(nice|mantul|mantab|keren|gokil|asik|asiik|asyik)\b/i,
    /^(noted|siapp|gas\s*lah|otw|lesgo|let'?s?\s*go)\b/i
];

// Laughter/Emoji reactions - never search
// NOTE: Be careful not to match real words like "harga", "handphone", etc.
const LAUGHTER_PATTERNS = [
    // Only match pure laughter strings (repeated syllables with nothing else)
    /^(wk){2,}$/i,           // wkwk, wkwkwk
    /^(hh){2,}$/i,           // hhhh
    /^(ha){2,}$/i,           // haha, hahaha
    /^(he){2,}$/i,           // hehe, hehehe
    /^(hi){2,}$/i,           // hihi, hihihi
    /^(ho){2,}$/i,           // hoho, hohoho
    /^(hu){2,}$/i,           // huhu, huhuhu
    /^lol+$/i,               // lol, loll
    /^lmao+$/i,              // lmao
    /^rofl+$/i,              // rofl
    /^(kwkw)+$/i,            // kwkwkw
    /^(xi){2,}$/i,           // xixi, xixixi
    /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+$/u,
    /^(😂|😭|🤣|💀|🔥|😅|😆|🙏|👍|👎|❤️|💯|😎|🤔|😤|😡|🥺|😢|😊|🥰|😍)+$/
];

// Small talk / casual conversation - never search
const SMALLTALK_PATTERNS = [
    /^(apa\s*kabar|gmn\s*kabar|gimana\s*kabar|how\s*are\s*you|how'?s?\s*it\s*going)/i,
    /^(lagi\s*(apa|ngapain|dimana)|lg\s*apa|ngapain|kerja\s*apa)/i,
    /^(gimana|gmn|gmana)\s*(lu|lo|kamu|elo|u)\??$/i,
    /^(lu|lo|kamu|elo|u)\s*(gimana|gmn|gmana|lagi\s*apa)\??$/i,
    /^(sibuk|busy|santai|chill|gabut|bosen|boring)/i,
    /^(sama|iya\s*juga|gw\s*juga|w\s*juga|me\s*too)/i
];

// Short confirmations/responses - never search
const SHORT_RESPONSE_PATTERNS = [
    /^(iya|ga|gak|engga|enggak|tidak|no|nope|nop|gajadi|batal|cancel)\b/i,
    /^(bener|betul|benar|salah|wrong|right)\b/i,
    /^(mungkin|maybe|kayanya|kynya|kyknya|sepertinya)\b/i,
    /^(cie|ciee|cieee|wkwk|anjir|anjay|asw|asuw|cuk|njir|njay)\b/i,
    /^[\?\!\.\,]+$/  // Just punctuation
];

// Questions about the BOT itself (not external info) - never search
const BOT_QUESTION_PATTERNS = [
    /(?:lu|lo|kamu|elo|u|bot|tama)\s*(?:bisa|bs|bsa)\s*(?:apa|ngapain)/i,
    /(?:fitur|feature|kemampuan|ability)\s*(?:lu|lo|kamu|bot)/i,
    /(?:lu|lo|kamu|elo|bot)\s*(?:tau|tahu|ngerti|paham)\s*(?:ga|gak|nggak)?\s*(?:soal|tentang)?/i,
    /(?:limit|batas|maksimal|max)\s*(?:lu|lo|kamu|bot|chat|pesan|response)/i,
    /(?:lu|lo|kamu|bot)\s*(?:limit|batas|maksimal|max)/i,
    /berapa\s*(?:limit|batas|max|panjang|karakter)\s*(?:lu|lo|kamu|bot|response|chat|pesan)/i,
    /(?:lu|lo|kamu|bot)\s*berapa\s*(?:limit|batas|max)/i
];

// Conversational questions that DON'T need external data - never search
const CONVERSATIONAL_QUESTION_PATTERNS = [
    /berapa\s+lama/i,           // "berapa lama"
    /gimana\s+(?:cara|caranya)/i, // "gimana caranya" 
    /(?:bisa|bs)\s+(?:ga|gak|nggak)/i,  // "bisa ga"
    /(?:mau|pengen|pgn)\s+(?:ga|gak|nggak)/i,
    /(?:udah|sudah|dah)\s+(?:belum|blm)/i,
    /(?:kapan|when)\s+(?:bisa|selesai|jadi|kelar)/i,
    /(?:kira|kira-kira|kiranya)\s+.{0,30}$/i,  // "kira-kira..." usually opinion
    /(?:menurut|mnrt)\s*(?:lu|lo|kamu|u)/i,   // "menurut lu" = asking opinion
    /(?:saran|advice|tips?)\s*(?:lu|lo|kamu|dong)/i,
    /(?:recommend|rekomendasi)\s*(?:dong|donk)/i,
    /^(?:kenapa|knp|why)\s+(?:lu|lo|kamu|gw|w|aku)/i,  // "kenapa lu/gw..."
    /^(?:apa|apaan)\s+(?:sih|si|seh)/i  // "apa sih" = rhetorical
];

// Questions ABOUT the current conversation - never search
const META_CONVERSATION_PATTERNS = [
    /(?:maksud|mksd)\s*(?:lu|lo|kamu|nya|gw|w)\s*(?:apa|apaan)/i,
    /(?:bisa|bs)\s*(?:jelasin|jelaskan|explain)/i,
    /(?:contoh|example)\s*(?:nya|dong|donk)/i,
    /(?:ulangi|repeat|ulang)\s*(?:dong|donk|lagi)/i,
    /(?:lebih|more)\s*(?:detail|jelas|spesifik)/i,
    /(?:singkat|pendek|ringkas|tldr)/i,
    /bukan\s*(?:search|cari|googling|browsing)/i,  // User explicitly says NOT search
    /jangan\s*(?:search|cari|googling|browsing)/i
];

// ═══════════════════════════════════════════════════════════
// EXPLICIT SEARCH TRIGGERS - Only these should trigger search
// ═══════════════════════════════════════════════════════════

const EXPLICIT_SEARCH_KEYWORDS = [
    'cari di internet', 'search di google', 'googling', 'cek di google',
    'browse', 'browsing', 'cari info', 'cari tau', 'cari tahu',
    'search for', 'look up', 'lookup', 'find info'
];

const EXPLICIT_SEARCH_COMMANDS = [
    /^\/?(search|cari|cariin|googling|browse)\s+(.+)/i,
    /^(tolong\s*)?(cari(?:in|kan)?|search(?:in)?)\s+(?:di\s+(?:internet|google|web)\s+)?(.+)/i
];

// ═══════════════════════════════════════════════════════════
// TIME-SENSITIVE/EXTERNAL DATA PATTERNS (need search)
// ═══════════════════════════════════════════════════════════

const NEEDS_EXTERNAL_DATA_PATTERNS = [
    // Weather
    /(?:cuaca|weather)\s+(?:di\s+)?[a-z]+\s+(?:hari\s+ini|sekarang|besok|minggu\s+ini)/i,
    /(?:hujan|cerah|panas|dingin)\s+(?:ga|gak|nggak)?\s+(?:di\s+)?[a-z]+/i,
    
    // Real-time prices
    /(?:harga|price)\s+(?:bitcoin|btc|eth|crypto|emas|gold|saham|stock)\s+(?:sekarang|hari\s+ini|terbaru)/i,
    /(?:bitcoin|btc|eth|dolar|dollar|usd|euro)\s+(?:sekarang|berapa|hari\s+ini)/i,
    
    // Current news/events
    /(?:berita|news)\s+(?:terbaru|hari\s+ini|terkini)/i,
    /(?:apa\s+yang\s+terjadi|what\s+happened)\s+(?:di|at|in)\s+[a-z]+/i,
    
    // Schedules
    /(?:jadwal|schedule)\s+(?:pertandingan|match|konser|acara)\s+[a-z]+/i,
    /(?:kapan|when)\s+(?:pertandingan|match|konser|film|movie)\s+[a-z]+/i,
    
    // Facts that need verification
    /^siapa\s+(?:presiden|president|ceo|founder|pendiri)\s+(?:of\s+)?[a-z]+/i,
    /^(?:dimana|where)\s+(?:lokasi|letak|alamat)\s+[a-z]+/i,
    
    // Definitions of SPECIFIC terms (not conversational)
    /^apa\s+itu\s+[a-z]{4,}\s*\??$/i,  // "apa itu blockchain?"
    /^[a-z]{4,}\s+(?:itu\s+)?(?:apa|artinya\s+apa)\s*\??$/i  // "blockchain itu apa?"
];

/**
 * NO-SEARCH GUARD - First line of defense
 * Returns true if message should NEVER trigger search
 * @param {string} text - Message text
 * @returns {boolean}
 */
const noSearchGuard = (text) => {
    if (!text) return true;
    
    const trimmed = text.trim();
    
    // Very short messages (< 15 chars) - almost always conversational
    if (trimmed.length < 15 && !EXPLICIT_SEARCH_KEYWORDS.some(kw => trimmed.toLowerCase().includes(kw))) {
        console.log('[WebSearch] GUARD: Message too short (<15 chars), blocking search');
        return true;
    }
    
    // Check all hard-block patterns
    const allBlockPatterns = [
        ...GREETING_PATTERNS,
        ...ACK_PATTERNS,
        ...LAUGHTER_PATTERNS,
        ...SMALLTALK_PATTERNS,
        ...SHORT_RESPONSE_PATTERNS,
        ...BOT_QUESTION_PATTERNS,
        ...CONVERSATIONAL_QUESTION_PATTERNS,
        ...META_CONVERSATION_PATTERNS
    ];
    
    for (const pattern of allBlockPatterns) {
        if (pattern.test(trimmed)) {
            console.log(`[WebSearch] GUARD: Blocked by pattern ${pattern.toString().substring(0, 50)}...`);
            return true;
        }
    }
    
    // Check for "bukan search" / "jangan search" explicit rejection
    if (/(?:bukan|jangan|ga\s*usah|gak\s*usah)\s*(?:search|cari|googling|browsing)/i.test(trimmed)) {
        console.log('[WebSearch] GUARD: User explicitly rejected search');
        return true;
    }
    
    return false;
};

/**
 * Check if message explicitly requests search
 * @param {string} text - Message text
 * @returns {Object|null} - { query } or null
 */
const checkExplicitSearchRequest = (text) => {
    if (!text) return null;
    
    const lowerText = text.toLowerCase();
    
    // Check explicit search commands
    for (const pattern of EXPLICIT_SEARCH_COMMANDS) {
        const match = text.match(pattern);
        if (match) {
            const query = (match[3] || match[2] || '').trim();
            if (query.length >= 3) {
                console.log(`[WebSearch] EXPLICIT search request: "${query}"`);
                return { query, confidence: 1.0, reason: 'explicit_command' };
            }
        }
    }
    
    // Check explicit keywords
    for (const keyword of EXPLICIT_SEARCH_KEYWORDS) {
        const idx = lowerText.indexOf(keyword);
        if (idx !== -1) {
            // Extract query after keyword
            let query = text.substring(idx + keyword.length).trim();
            // Also try to get text before keyword if query is empty
            if (!query || query.length < 3) {
                const before = text.substring(0, idx).trim();
                if (before.length >= 3) query = before;
            }
            if (query && query.length >= 3) {
                console.log(`[WebSearch] EXPLICIT keyword "${keyword}" found, query: "${query}"`);
                return { query, confidence: 0.95, reason: 'explicit_keyword' };
            }
        }
    }
    
    return null;
};

/**
 * Check if message needs external/time-sensitive data
 * @param {string} text - Message text
 * @returns {Object|null} - { query, confidence } or null
 */
const checkNeedsExternalData = (text) => {
    if (!text) return null;
    
    for (const pattern of NEEDS_EXTERNAL_DATA_PATTERNS) {
        if (pattern.test(text)) {
            // Extract the main query (usually the whole message)
            const query = text.trim();
            console.log(`[WebSearch] Needs external data: "${query}"`);
            return { query, confidence: 0.75, reason: 'external_data_needed' };
        }
    }
    
    return null;
};

/**
 * Main search request detector with comprehensive guards
 * FIXED: Implements proper NO-SEARCH GUARD and intent hierarchy
 * 
 * Priority: CHAT > EXPLICIT_SEARCH > EXTERNAL_NEED
 * 
 * @param {string} text - Message text
 * @param {Array} conversationHistory - Optional conversation context
 * @returns {Object|null} - { isSearch, query, confidence, reason } or null
 */
const detectSearchRequest = (text, conversationHistory = []) => {
    if (!text) return null;
    
    console.log(`[WebSearch] Analyzing: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
    
    // ═══════════════════════════════════════════════════════════
    // STEP 1: NO-SEARCH GUARD (highest priority)
    // ═══════════════════════════════════════════════════════════
    if (noSearchGuard(text)) {
        console.log('[WebSearch] DECISION: CHAT (blocked by guard)');
        return null;
    }
    
    // ═══════════════════════════════════════════════════════════
    // STEP 2: Check for EXPLICIT search request
    // ═══════════════════════════════════════════════════════════
    const explicitSearch = checkExplicitSearchRequest(text);
    if (explicitSearch) {
        console.log(`[WebSearch] DECISION: SEARCH (explicit) - confidence: ${explicitSearch.confidence}`);
        return {
            isSearch: true,
            ...explicitSearch
        };
    }
    
    // ═══════════════════════════════════════════════════════════
    // STEP 3: Check if needs external/time-sensitive data
    // Only trigger if confidence > 0.7
    // ═══════════════════════════════════════════════════════════
    const externalData = checkNeedsExternalData(text);
    if (externalData && externalData.confidence >= 0.7) {
        console.log(`[WebSearch] DECISION: SEARCH (external need) - confidence: ${externalData.confidence}`);
        return {
            isSearch: true,
            ...externalData
        };
    }
    
    // ═══════════════════════════════════════════════════════════
    // STEP 4: Default to CHAT (no search)
    // ═══════════════════════════════════════════════════════════
    console.log('[WebSearch] DECISION: CHAT (default - no search triggers matched)');
    return null;
};

/**
 * Search using DuckDuckGo Instant Answer API
 * @param {string} query - Search query
 * @returns {Promise<Object>} - Search result
 */
const searchDuckDuckGo = async (query) => {
    try {
        const response = await axios.get(DDG_API, {
            params: {
                q: query,
                format: 'json',
                no_redirect: 1,
                no_html: 1,
                skip_disambig: 1
            },
            timeout: 25000
        });
        
        const data = response.data;
        
        // Extract useful info
        const result = {
            success: true,
            query: query,
            abstract: data.Abstract || null,
            abstractSource: data.AbstractSource || null,
            abstractURL: data.AbstractURL || null,
            answer: data.Answer || null,
            definition: data.Definition || null,
            definitionSource: data.DefinitionSource || null,
            heading: data.Heading || null,
            image: data.Image || null,
            relatedTopics: (data.RelatedTopics || []).slice(0, 5).map(t => ({
                text: t.Text,
                url: t.FirstURL
            })).filter(t => t.text),
            infobox: data.Infobox || null,
            type: data.Type || null
        };
        
        // Check if we got any useful content
        const hasContent = result.abstract || result.answer || result.definition || result.relatedTopics.length > 0;
        
        return {
            ...result,
            hasContent
        };
        
    } catch (error) {
        console.error('[WebSearch] DuckDuckGo error:', error.message);
        return {
            success: false,
            error: error.message,
            hasContent: false
        };
    }
};

/**
 * Search using SerpAPI-like scraping (fallback)
 * This is a simple HTML scraper for Google
 * Note: May break if Google changes their HTML
 */
const searchGoogleScrape = async (query) => {
    try {
        const response = await axios.get('https://www.google.com/search', {
            params: {
                q: query,
                hl: 'id',
                gl: 'id',
                num: 8
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 25000
        });
        
        // Very basic scraping - extract snippets
        const html = response.data;
        const snippetMatches = html.match(/<div class="BNeawe s3v9rd AP7Wnd">(.*?)<\/div>/g) || [];
        
        const snippets = snippetMatches
            .slice(0, 8)
            .map(s => s.replace(/<[^>]*>/g, '').trim())
            .filter(s => s.length > 20);
        
        return {
            success: true,
            query,
            snippets,
            hasContent: snippets.length > 0
        };
        
    } catch (error) {
        console.error('[WebSearch] Google scrape error:', error.message);
        return {
            success: false,
            error: error.message,
            hasContent: false
        };
    }
};

/**
 * Search using DuckDuckGo HTML (more comprehensive results than instant answer API)
 * @param {string} query - Search query
 * @returns {Promise<Object>} - Search result
 */
const searchDuckDuckGoHTML = async (query) => {
    try {
        const response = await axios.get('https://html.duckduckgo.com/html/', {
            params: { q: query },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 25000
        });

        const html = response.data;

        // Extract result snippets from DDG HTML
        const resultBlocks = html.match(/<a class="result__snippet"[^>]*>(.*?)<\/a>/gs) || [];
        const titleBlocks = html.match(/<a class="result__a"[^>]*>(.*?)<\/a>/gs) || [];
        const urlBlocks = html.match(/<a class="result__url"[^>]*>(.*?)<\/a>/gs) || [];

        const snippets = resultBlocks
            .slice(0, 8)
            .map(s => s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").trim())
            .filter(s => s.length > 15);

        const titles = titleBlocks
            .slice(0, 8)
            .map(s => s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim())
            .filter(s => s.length > 3);

        const urls = urlBlocks
            .slice(0, 8)
            .map(s => s.replace(/<[^>]*>/g, '').trim())
            .filter(s => s.length > 3);

        // Combine into structured results
        const results = snippets.map((snippet, i) => ({
            title: titles[i] || '',
            snippet: snippet,
            url: urls[i] || ''
        }));

        return {
            success: true,
            query,
            snippets,
            results,
            hasContent: snippets.length > 0,
            source: 'duckduckgo_html'
        };

    } catch (error) {
        console.error('[WebSearch] DuckDuckGo HTML error:', error.message);
        return {
            success: false,
            error: error.message,
            hasContent: false
        };
    }
};

/**
 * Main search function - combines multiple sources for best results
 * @param {string} query 
 * @returns {Promise<Object>}
 */
const webSearch = async (query) => {
    // Try DuckDuckGo instant answer first (fast, good for definitions)
    let result = await searchDuckDuckGo(query);
    
    // If no content from instant answer, try DuckDuckGo HTML search (comprehensive)
    if (!result.hasContent) {
        console.log('[WebSearch] DuckDuckGo instant no content, trying DDG HTML...');
        const ddgHtmlResult = await searchDuckDuckGoHTML(query);
        if (ddgHtmlResult.hasContent) {
            result = {
                ...result,
                ...ddgHtmlResult,
                source: 'duckduckgo_html'
            };
        }
    } else {
        result.source = 'duckduckgo';
    }
    
    // If still no content, try Google scrape as last fallback
    if (!result.hasContent) {
        console.log('[WebSearch] DDG no content, trying Google fallback...');
        const googleResult = await searchGoogleScrape(query);
        if (googleResult.hasContent) {
            result = {
                ...result,
                ...googleResult,
                source: 'google'
            };
        }
    }
    
    return result;
};

/**
 * Format search results untuk chat response
 * @param {Object} result - Search result object
 * @returns {string} - Formatted text
 */
const formatSearchResult = (result) => {
    if (!result.success || !result.hasContent) {
        return null;
    }
    
    let formatted = `🔍 *Hasil pencarian: "${result.query}"*\n\n`;
    
    // Add main content
    if (result.abstract) {
        formatted += `📖 ${result.abstract}\n`;
        if (result.abstractSource) {
            formatted += `_Sumber: ${result.abstractSource}_\n`;
        }
        formatted += '\n';
    }
    
    if (result.answer) {
        formatted += `💡 *Jawaban:* ${result.answer}\n\n`;
    }
    
    if (result.definition) {
        formatted += `📚 *Definisi:* ${result.definition}\n`;
        if (result.definitionSource) {
            formatted += `_Sumber: ${result.definitionSource}_\n`;
        }
        formatted += '\n';
    }
    
    // Add related topics if no main content
    if (!result.abstract && !result.answer && !result.definition && result.relatedTopics?.length > 0) {
        formatted += '📋 *Topik terkait:*\n';
        result.relatedTopics.forEach((topic, i) => {
            formatted += `${i + 1}. ${topic.text}\n`;
        });
    }
    
    // Add Google snippets if available
    if (result.snippets?.length > 0) {
        formatted += '📝 *Snippets:*\n';
        result.snippets.forEach((snippet, i) => {
            formatted += `• ${snippet}\n`;
        });
    }
    
    // Handle no results
    if (!result.abstract && !result.answer && !result.definition && 
        (!result.relatedTopics || result.relatedTopics.length === 0) &&
        (!result.snippets || result.snippets.length === 0)) {
        return `Hasil pencarian untuk "${result.query}" tidak ditemukan. Coba kata kunci lain.`;
    }
    
    return formatted.trim();
};

/**
 * Sanitize search query
 */
const sanitizeQuery = (query) => {
    if (!query) return '';
    return query
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/[<>]/g, '') // Remove angle brackets
        .trim();
};

/**
 * Parse DuckDuckGo response
 */
const parseSearchResults = (ddgResponse) => {
    const results = [];
    
    if (!ddgResponse?.RelatedTopics) return results;
    
    for (const topic of ddgResponse.RelatedTopics) {
        if (topic.Text && topic.FirstURL) {
            results.push({
                title: topic.Text.split(' - ')[0] || topic.Text,
                snippet: topic.Text,
                url: topic.FirstURL
            });
        }
        
        // Handle nested topics
        if (topic.Topics) {
            for (const nested of topic.Topics) {
                if (nested.Text && nested.FirstURL) {
                    results.push({
                        title: nested.Text.split(' - ')[0] || nested.Text,
                        snippet: nested.Text,
                        url: nested.FirstURL
                    });
                }
            }
        }
    }
    
    return results;
};

/**
 * Check if query is informational (DEPRECATED - use detectSearchRequest instead)
 * Kept for backwards compatibility but now returns false by default
 */
const isInfoQuery = (text) => {
    // DEPRECATED: This function was causing false positives
    // All info query detection is now handled by detectSearchRequest
    // which has proper guards
    console.log('[WebSearch] DEPRECATED: isInfoQuery called, returning false');
    return false;
};

// ═══════════════════════════════════════════════════════════
// AI-DRIVEN SEARCH: [WEBSEARCH:query] marker
// AI can request a web search by including this marker in its response
// Bot intercepts it, searches, and calls AI again with results
// ═══════════════════════════════════════════════════════════

/**
 * Regex to detect AI's web search request marker
 * Format: [WEBSEARCH:query text here]
 */
const WEBSEARCH_MARKER_REGEX = /\[WEBSEARCH:([^\]]+)\]/;

/**
 * Parse AI response for web search marker
 * @param {string} response - AI response text
 * @returns {{ needsSearch: boolean, query: string } | null}
 */
const parseWebSearchMarker = (response) => {
    if (!response) return null;
    
    const match = response.match(WEBSEARCH_MARKER_REGEX);
    if (!match) return null;
    
    const query = match[1].trim();
    if (query.length < 3) return null;
    
    console.log(`[WebSearch] AI requested search: "${query}"`);
    return { needsSearch: true, query };
};

// Constants
const SEARCH_KEYWORDS = ['search', 'cari', 'googling', 'cariin', 'lookup', 'browse'];
const DUCKDUCKGO_API_URL = DDG_API;
const MAX_RESULTS = 5;

module.exports = {
    detectSearchRequest,
    noSearchGuard,
    checkExplicitSearchRequest,
    checkNeedsExternalData,
    webSearch,
    searchDuckDuckGo,
    searchDuckDuckGoHTML,
    formatSearchResult,
    sanitizeQuery,
    parseSearchResults,
    parseWebSearchMarker,
    isInfoQuery,
    WEBSEARCH_MARKER_REGEX,
    SEARCH_KEYWORDS,
    DUCKDUCKGO_API_URL,
    MAX_RESULTS,
    DDG_API
};
