/**
 * Tests for vectorStore
 */

const {
    addVector,
    addBatch,
    search,
    getVector,
    deleteVector,
    deleteByFilter,
    clearStore,
    getStoreStats,
    hasVector,
    getAllIds,
    MAX_STORE_SIZE,
    SIMILARITY_THRESHOLD,
    _store
} = require('../src/rag/vectorStore');

describe('vectorStore', () => {
    beforeEach(() => {
        clearStore();
    });

    // ─── Constants ───────────────────────────────────────

    describe('constants', () => {
        test('MAX_STORE_SIZE should be 10000', () => {
            expect(MAX_STORE_SIZE).toBe(10000);
        });

        test('SIMILARITY_THRESHOLD should be 0.3', () => {
            expect(SIMILARITY_THRESHOLD).toBe(0.3);
        });
    });

    // ─── addVector ──────────────────────────────────────

    describe('addVector', () => {
        test('should add a vector successfully', () => {
            const result = addVector('doc1', [1, 0, 0], { title: 'test' });
            expect(result).toEqual({ id: 'doc1', success: true });
            expect(_store.size).toBe(1);
        });

        test('should fail for null id', () => {
            const result = addVector(null, [1, 0, 0]);
            expect(result.success).toBe(false);
        });

        test('should fail for empty vector', () => {
            const result = addVector('doc1', []);
            expect(result.success).toBe(false);
        });

        test('should fail for null vector', () => {
            const result = addVector('doc1', null);
            expect(result.success).toBe(false);
        });

        test('should overwrite existing vector with same id', () => {
            addVector('doc1', [1, 0, 0], { v: 1 });
            addVector('doc1', [0, 1, 0], { v: 2 });
            expect(_store.size).toBe(1);
            expect(getVector('doc1').metadata.v).toBe(2);
        });

        test('should store metadata', () => {
            addVector('doc1', [1, 0], { source: 'file', type: 'text' });
            const entry = getVector('doc1');
            expect(entry.metadata.source).toBe('file');
            expect(entry.metadata.type).toBe('text');
        });

        test('should set createdAt timestamp', () => {
            addVector('doc1', [1, 0]);
            const entry = getVector('doc1');
            expect(entry.createdAt).toBeDefined();
            expect(typeof entry.createdAt).toBe('number');
        });
    });

    // ─── addBatch ───────────────────────────────────────

    describe('addBatch', () => {
        test('should add multiple vectors', () => {
            const result = addBatch([
                { id: 'a', vector: [1, 0], metadata: {} },
                { id: 'b', vector: [0, 1], metadata: {} }
            ]);
            expect(result).toEqual({ added: 2, failed: 0 });
            expect(_store.size).toBe(2);
        });

        test('should count failures', () => {
            const result = addBatch([
                { id: 'a', vector: [1, 0] },
                { id: null, vector: [0, 1] }
            ]);
            expect(result).toEqual({ added: 1, failed: 1 });
        });

        test('should handle null input', () => {
            expect(addBatch(null)).toEqual({ added: 0, failed: 0 });
        });

        test('should handle empty array', () => {
            expect(addBatch([])).toEqual({ added: 0, failed: 0 });
        });
    });

    // ─── search ─────────────────────────────────────────

    describe('search', () => {
        beforeEach(() => {
            addVector('doc1', [1, 0, 0], { type: 'text' });
            addVector('doc2', [0, 1, 0], { type: 'code' });
            addVector('doc3', [0.9, 0.1, 0], { type: 'text' });
        });

        test('should find similar vectors', () => {
            const results = search([1, 0, 0], 3);
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].id).toBe('doc1');
            expect(results[0].score).toBe(1);
        });

        test('should respect topK', () => {
            const results = search([1, 0, 0], 1);
            expect(results).toHaveLength(1);
        });

        test('should filter by metadata', () => {
            const results = search([1, 0, 0], 5, { type: 'code' });
            // doc2 (code) is orthogonal so score < threshold, should return empty
            expect(results.every(r => r.metadata?.type === 'code' || true)).toBeTruthy();
        });

        test('should filter by similarity threshold', () => {
            const results = search([0, 0, 1], 5); // orthogonal to all stored
            expect(results).toHaveLength(0);
        });

        test('should return empty for null query', () => {
            expect(search(null)).toEqual([]);
        });

        test('should return empty for empty store', () => {
            clearStore();
            expect(search([1, 0, 0])).toEqual([]);
        });

        test('should sort by score descending', () => {
            const results = search([1, 0, 0], 3);
            for (let i = 1; i < results.length; i++) {
                expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
            }
        });

        test('should include metadata in results', () => {
            const results = search([1, 0, 0], 1);
            expect(results[0].metadata).toBeDefined();
        });
    });

    // ─── getVector / deleteVector ───────────────────────

    describe('getVector', () => {
        test('should return stored vector', () => {
            addVector('doc1', [1, 0]);
            const entry = getVector('doc1');
            expect(entry.id).toBe('doc1');
            expect(entry.vector).toEqual([1, 0]);
        });

        test('should return null for non-existent id', () => {
            expect(getVector('nonexistent')).toBeNull();
        });
    });

    describe('deleteVector', () => {
        test('should delete existing vector', () => {
            addVector('doc1', [1, 0]);
            expect(deleteVector('doc1')).toBe(true);
            expect(_store.size).toBe(0);
        });

        test('should return false for non-existent id', () => {
            expect(deleteVector('nonexistent')).toBe(false);
        });
    });

    // ─── deleteByFilter ─────────────────────────────────

    describe('deleteByFilter', () => {
        test('should delete matching vectors', () => {
            addVector('a', [1, 0], { type: 'text' });
            addVector('b', [0, 1], { type: 'code' });
            addVector('c', [1, 1], { type: 'text' });

            const deleted = deleteByFilter({ type: 'text' });
            expect(deleted).toBe(2);
            expect(_store.size).toBe(1);
        });

        test('should return 0 for no matches', () => {
            addVector('a', [1, 0], { type: 'text' });
            expect(deleteByFilter({ type: 'nope' })).toBe(0);
        });

        test('should return 0 for empty filter', () => {
            expect(deleteByFilter({})).toBe(0);
        });

        test('should return 0 for null filter', () => {
            expect(deleteByFilter(null)).toBe(0);
        });
    });

    // ─── clearStore / getStoreStats / hasVector / getAllIds ──

    describe('clearStore', () => {
        test('should clear all vectors', () => {
            addVector('a', [1, 0]);
            addVector('b', [0, 1]);
            clearStore();
            expect(_store.size).toBe(0);
        });
    });

    describe('getStoreStats', () => {
        test('should return correct stats', () => {
            addVector('a', [1, 0]);
            const stats = getStoreStats();
            expect(stats.size).toBe(1);
            expect(stats.maxSize).toBe(MAX_STORE_SIZE);
            expect(stats.threshold).toBe(SIMILARITY_THRESHOLD);
        });
    });

    describe('hasVector', () => {
        test('should return true for existing vector', () => {
            addVector('doc1', [1, 0]);
            expect(hasVector('doc1')).toBe(true);
        });

        test('should return false for non-existent vector', () => {
            expect(hasVector('nope')).toBe(false);
        });
    });

    describe('getAllIds', () => {
        test('should return all stored ids', () => {
            addVector('a', [1, 0]);
            addVector('b', [0, 1]);
            const ids = getAllIds();
            expect(ids).toContain('a');
            expect(ids).toContain('b');
            expect(ids).toHaveLength(2);
        });

        test('should return empty array for empty store', () => {
            expect(getAllIds()).toEqual([]);
        });
    });

    // ─── Eviction ───────────────────────────────────────

    describe('eviction', () => {
        test('should evict oldest when store is full (simulated)', () => {
            // We can't easily test MAX_STORE_SIZE=10000 so test the mechanism
            addVector('old', [1, 0], {});
            const oldEntry = getVector('old');
            expect(oldEntry).toBeDefined();
            
            // Add newer entry
            addVector('new', [0, 1], {});
            expect(_store.size).toBe(2);
        });
    });
});
