/**
 * Reasoning Cache — in-memory cache for reasoning results
 *
 * LRU cache with TTL buat avoid re-reasoning
 * pertanyaan yang sama/mirip.
 *
 * @author Tama El Pablo
 */

const crypto = require('crypto');

const CACHE_TTL = 30 * 60 * 1000;  // 30 minutes
const MAX_CACHE_SIZE = 100;

/** @type {Map<string, { data: object, timestamp: number }>} */
const _reasoningCache = new Map();

/**
 * Generate cache key from query + context hash
 *
 * @param {string} query
 * @param {object} [context={}]
 * @returns {string}
 */
const getCacheKey = (query, context = {}) => {
    const normalized = (query || '').toLowerCase().trim().replace(/\s+/g, ' ');
    const ctxHash = context.additionalContext
        ? crypto.createHash('md5').update(context.additionalContext).digest('hex').substring(0, 8)
        : '';
    return `${normalized}_${ctxHash}`;
};

/**
 * Get cached reasoning result
 *
 * @param {string} query
 * @param {object} [context={}]
 * @returns {object|null}
 */
const getCachedReasoning = (query, context = {}) => {
    const key = getCacheKey(query, context);
    const entry = _reasoningCache.get(key);

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        _reasoningCache.delete(key);
        return null;
    }

    return entry.data;
};

/**
 * Store reasoning result in cache
 *
 * @param {string} query
 * @param {object} result
 * @param {object} [context={}]
 */
const setCachedReasoning = (query, result, context = {}) => {
    const key = getCacheKey(query, context);

    // LRU eviction
    if (_reasoningCache.size >= MAX_CACHE_SIZE) {
        let oldest = null;
        let oldestTime = Infinity;
        for (const [k, v] of _reasoningCache) {
            if (v.timestamp < oldestTime) {
                oldest = k;
                oldestTime = v.timestamp;
            }
        }
        if (oldest) _reasoningCache.delete(oldest);
    }

    _reasoningCache.set(key, {
        data: result,
        timestamp: Date.now()
    });
};

/**
 * Clear all cached reasoning
 */
const clearCache = () => {
    _reasoningCache.clear();
};

/**
 * Get cache stats
 *
 * @returns {{ size: number, maxSize: number, ttlMs: number }}
 */
const getCacheStats = () => {
    return {
        size: _reasoningCache.size,
        maxSize: MAX_CACHE_SIZE,
        ttlMs: CACHE_TTL
    };
};

/**
 * Evict expired entries
 *
 * @returns {number} count of evicted entries
 */
const evictExpired = () => {
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of _reasoningCache) {
        if (now - entry.timestamp > CACHE_TTL) {
            _reasoningCache.delete(key);
            count++;
        }
    }
    return count;
};

module.exports = {
    getCachedReasoning,
    setCachedReasoning,
    clearCache,
    getCacheStats,
    getCacheKey,
    evictExpired,
    _reasoningCache,
    CACHE_TTL,
    MAX_CACHE_SIZE
};
