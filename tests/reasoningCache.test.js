/**
 * Tests for Reasoning Cache
 */

const {
    getCachedReasoning,
    setCachedReasoning,
    clearCache,
    getCacheStats,
    getCacheKey,
    evictExpired,
    _reasoningCache,
    CACHE_TTL,
    MAX_CACHE_SIZE
} = require('../src/reasoning/reasoningCache');

describe('reasoningCache', () => {
    beforeEach(() => {
        clearCache();
    });

    describe('getCacheKey', () => {
        test('should normalize query', () => {
            const k1 = getCacheKey('Hello World');
            const k2 = getCacheKey('hello world');
            expect(k1).toBe(k2);
        });

        test('should trim and collapse spaces', () => {
            const k1 = getCacheKey('test query');
            const k2 = getCacheKey('  test   query  ');
            expect(k1).toBe(k2);
        });

        test('should include context hash when additionalContext exists', () => {
            const k1 = getCacheKey('query', {});
            const k2 = getCacheKey('query', { additionalContext: 'extra info' });
            expect(k1).not.toBe(k2);
        });

        test('should handle empty query', () => {
            const key = getCacheKey('');
            expect(key).toBeDefined();
        });
    });

    describe('setCachedReasoning / getCachedReasoning', () => {
        test('should store and retrieve', () => {
            const data = { steps: ['a', 'b'], conclusion: 'yes' };
            setCachedReasoning('test query', data);
            const result = getCachedReasoning('test query');
            expect(result).toEqual(data);
        });

        test('should return null for cache miss', () => {
            expect(getCachedReasoning('unknown query')).toBeNull();
        });

        test('should be case-insensitive', () => {
            setCachedReasoning('Test Query', { x: 1 });
            expect(getCachedReasoning('test query')).toEqual({ x: 1 });
        });

        test('should differentiate queries with context', () => {
            setCachedReasoning('query', { a: 1 }, { additionalContext: 'ctx1' });
            setCachedReasoning('query', { b: 2 }, { additionalContext: 'ctx2' });
            expect(getCachedReasoning('query', { additionalContext: 'ctx1' })).toEqual({ a: 1 });
            expect(getCachedReasoning('query', { additionalContext: 'ctx2' })).toEqual({ b: 2 });
        });

        test('should evict expired entries on get', () => {
            setCachedReasoning('old query', { x: 1 });
            // Manually set timestamp to past
            const key = getCacheKey('old query');
            _reasoningCache.get(key).timestamp = Date.now() - CACHE_TTL - 1000;
            expect(getCachedReasoning('old query')).toBeNull();
        });
    });

    describe('LRU eviction', () => {
        test('should evict oldest when max size reached', () => {
            // Fill cache to max
            for (let i = 0; i < MAX_CACHE_SIZE; i++) {
                setCachedReasoning(`query number ${i} padding`, { i });
            }
            expect(_reasoningCache.size).toBe(MAX_CACHE_SIZE);

            // Add one more — should evict oldest
            setCachedReasoning('query new entry here pls', { new: true });
            expect(_reasoningCache.size).toBe(MAX_CACHE_SIZE);

            // The new one should exist
            expect(getCachedReasoning('query new entry here pls')).toEqual({ new: true });
        });
    });

    describe('clearCache', () => {
        test('should clear all entries', () => {
            setCachedReasoning('q1 padded out', { a: 1 });
            setCachedReasoning('q2 padded out', { b: 2 });
            expect(_reasoningCache.size).toBe(2);
            clearCache();
            expect(_reasoningCache.size).toBe(0);
        });
    });

    describe('getCacheStats', () => {
        test('should return correct stats', () => {
            setCachedReasoning('stat query here', { x: 1 });
            const stats = getCacheStats();
            expect(stats.size).toBe(1);
            expect(stats.maxSize).toBe(MAX_CACHE_SIZE);
            expect(stats.ttlMs).toBe(CACHE_TTL);
        });
    });

    describe('evictExpired', () => {
        test('should remove expired entries', () => {
            setCachedReasoning('fresh query pad', { f: 1 });
            setCachedReasoning('stale query pad', { s: 1 });

            // Make one stale
            const staleKey = getCacheKey('stale query pad');
            _reasoningCache.get(staleKey).timestamp = Date.now() - CACHE_TTL - 1000;

            const evicted = evictExpired();
            expect(evicted).toBe(1);
            expect(_reasoningCache.size).toBe(1);
        });

        test('should return 0 when nothing expired', () => {
            setCachedReasoning('fresh query pad', { f: 1 });
            expect(evictExpired()).toBe(0);
        });
    });

    describe('constants', () => {
        test('CACHE_TTL should be 30 minutes', () => {
            expect(CACHE_TTL).toBe(30 * 60 * 1000);
        });

        test('MAX_CACHE_SIZE should be 100', () => {
            expect(MAX_CACHE_SIZE).toBe(100);
        });
    });
});
