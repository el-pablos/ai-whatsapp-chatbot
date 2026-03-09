/**
 * Tests for ragRetriever
 */

jest.mock('../src/rag/embeddingService', () => ({
    generateEmbedding: jest.fn(),
    cosineSimilarity: jest.requireActual('../src/rag/embeddingService').cosineSimilarity
}));

jest.mock('../src/rag/vectorStore', () => ({
    search: jest.fn(),
    getStoreStats: jest.fn()
}));

const { generateEmbedding } = require('../src/rag/embeddingService');
const { search, getStoreStats } = require('../src/rag/vectorStore');
const {
    retrieve,
    buildContext,
    retrieveContext,
    isReady,
    DEFAULT_TOP_K,
    MAX_CONTEXT_CHARS,
    MIN_RELEVANCE_SCORE
} = require('../src/rag/ragRetriever');

describe('ragRetriever', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ─── Constants ───────────────────────────────────────

    describe('constants', () => {
        test('DEFAULT_TOP_K should be 5', () => {
            expect(DEFAULT_TOP_K).toBe(5);
        });

        test('MAX_CONTEXT_CHARS should be 6000', () => {
            expect(MAX_CONTEXT_CHARS).toBe(6000);
        });

        test('MIN_RELEVANCE_SCORE should be 0.35', () => {
            expect(MIN_RELEVANCE_SCORE).toBe(0.35);
        });
    });

    // ─── retrieve ───────────────────────────────────────

    describe('retrieve', () => {
        test('should return empty for null query', async () => {
            const result = await retrieve(null);
            expect(result.chunks).toEqual([]);
            expect(result.stats.searched).toBe(0);
        });

        test('should return empty for empty query', async () => {
            const result = await retrieve('');
            expect(result.chunks).toEqual([]);
        });

        test('should return empty when store is empty', async () => {
            getStoreStats.mockReturnValue({ size: 0 });

            const result = await retrieve('test query');
            expect(result.chunks).toEqual([]);
            expect(result.stats.storeEmpty).toBe(true);
        });

        test('should return empty when embedding fails (all zeros)', async () => {
            getStoreStats.mockReturnValue({ size: 10 });
            generateEmbedding.mockResolvedValue(new Array(1536).fill(0));

            const result = await retrieve('test query');
            expect(result.chunks).toEqual([]);
            expect(result.stats.embeddingFailed).toBe(true);
        });

        test('should retrieve and filter results by minScore', async () => {
            getStoreStats.mockReturnValue({ size: 10 });
            generateEmbedding.mockResolvedValue([1, 0, 0]);
            search.mockReturnValue([
                { id: 'a', score: 0.9, metadata: { documentId: 'doc1', chunkIndex: 0 } },
                { id: 'b', score: 0.5, metadata: { documentId: 'doc1', chunkIndex: 1 } },
                { id: 'c', score: 0.1, metadata: { documentId: 'doc2', chunkIndex: 0 } }
            ]);

            const result = await retrieve('test', { minScore: 0.35 });
            expect(result.chunks.length).toBe(2); // c filtered out
            expect(result.stats.found).toBe(2);
        });

        test('should respect topK option', async () => {
            getStoreStats.mockReturnValue({ size: 10 });
            generateEmbedding.mockResolvedValue([1, 0, 0]);
            search.mockReturnValue([
                { id: 'a', score: 0.9, metadata: { documentId: 'doc1', chunkIndex: 0 } },
                { id: 'b', score: 0.8, metadata: { documentId: 'doc2', chunkIndex: 0 } },
                { id: 'c', score: 0.7, metadata: { documentId: 'doc3', chunkIndex: 0 } }
            ]);

            const result = await retrieve('test', { topK: 1 });
            expect(result.chunks).toHaveLength(1);
        });

        test('should deduplicate chunks with same documentId and chunkIndex', async () => {
            getStoreStats.mockReturnValue({ size: 10 });
            generateEmbedding.mockResolvedValue([1, 0, 0]);
            search.mockReturnValue([
                { id: 'a', score: 0.9, metadata: { documentId: 'doc1', chunkIndex: 0 } },
                { id: 'a_dup', score: 0.85, metadata: { documentId: 'doc1', chunkIndex: 0 } }
            ]);

            const result = await retrieve('test');
            expect(result.chunks).toHaveLength(1);
        });

        test('should include stats in result', async () => {
            getStoreStats.mockReturnValue({ size: 50 });
            generateEmbedding.mockResolvedValue([1, 0, 0]);
            search.mockReturnValue([
                { id: 'a', score: 0.9, metadata: { documentId: 'doc1', chunkIndex: 0 } }
            ]);

            const result = await retrieve('test');
            expect(result.stats.searched).toBe(50);
            expect(result.stats.found).toBe(1);
            expect(result.stats.maxScore).toBe(0.9);
        });
    });

    // ─── buildContext ───────────────────────────────────

    describe('buildContext', () => {
        test('should return empty for null chunks', () => {
            expect(buildContext(null)).toBe('');
        });

        test('should return empty for empty chunks', () => {
            expect(buildContext([])).toBe('');
        });

        test('should join chunks with separator', () => {
            const chunks = [
                { text: 'chunk one', score: 0.9 },
                { text: 'chunk two', score: 0.7 }
            ];
            const context = buildContext(chunks);
            expect(context).toContain('chunk one');
            expect(context).toContain('chunk two');
            expect(context).toContain('---');
        });

        test('should include scores when requested', () => {
            const chunks = [{ text: 'content', score: 0.85 }];
            const context = buildContext(chunks, { includeScores: true });
            expect(context).toContain('0.85');
        });

        test('should not include scores by default', () => {
            const chunks = [{ text: 'content', score: 0.85 }];
            const context = buildContext(chunks);
            expect(context).not.toContain('relevance');
        });

        test('should truncate at maxChars', () => {
            const chunks = [
                { text: 'a'.repeat(3000), score: 0.9 },
                { text: 'b'.repeat(3000), score: 0.8 },
                { text: 'c'.repeat(3000), score: 0.7 }
            ];
            const context = buildContext(chunks, { maxChars: 5000 });
            expect(context.length).toBeLessThanOrEqual(5200); // some tolerance for separator
        });

        test('should get text from metadata if no direct text', () => {
            const chunks = [{ metadata: { text: 'from meta' }, score: 0.9 }];
            const context = buildContext(chunks);
            expect(context).toContain('from meta');
        });
    });

    // ─── retrieveContext ────────────────────────────────

    describe('retrieveContext', () => {
        test('should return context string and chunks', async () => {
            getStoreStats.mockReturnValue({ size: 10 });
            generateEmbedding.mockResolvedValue([1, 0, 0]);
            search.mockReturnValue([
                { id: 'a', score: 0.9, metadata: { documentId: 'doc1', chunkIndex: 0, text: 'hello' } }
            ]);

            const result = await retrieveContext('test');
            expect(result.context).toBeDefined();
            expect(result.chunks).toBeDefined();
            expect(result.stats).toBeDefined();
        });
    });

    // ─── isReady ────────────────────────────────────────

    describe('isReady', () => {
        test('should return ready=true when store has vectors', () => {
            getStoreStats.mockReturnValue({ size: 5 });
            const status = isReady();
            expect(status.ready).toBe(true);
            expect(status.documentCount).toBe(5);
        });

        test('should return ready=false when store is empty', () => {
            getStoreStats.mockReturnValue({ size: 0 });
            const status = isReady();
            expect(status.ready).toBe(false);
        });
    });
});
