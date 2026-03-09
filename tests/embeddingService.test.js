/**
 * Tests for embeddingService
 */

const axios = require('axios');
jest.mock('axios');

const {
    generateEmbedding,
    generateBatchEmbeddings,
    cosineSimilarity,
    findSimilar,
    EMBEDDING_MODEL,
    EMBEDDING_DIMENSIONS,
    MAX_BATCH_SIZE
} = require('../src/rag/embeddingService');

describe('embeddingService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ─── Constants ───────────────────────────────────────
    
    describe('constants', () => {
        test('EMBEDDING_MODEL should be text-embedding-3-small', () => {
            expect(EMBEDDING_MODEL).toBe('text-embedding-3-small');
        });

        test('EMBEDDING_DIMENSIONS should be 1536', () => {
            expect(EMBEDDING_DIMENSIONS).toBe(1536);
        });

        test('MAX_BATCH_SIZE should be 20', () => {
            expect(MAX_BATCH_SIZE).toBe(20);
        });
    });

    // ─── generateEmbedding ──────────────────────────────
    
    describe('generateEmbedding', () => {
        test('should return zero vector for empty input', async () => {
            const result = await generateEmbedding('');
            expect(result).toHaveLength(EMBEDDING_DIMENSIONS);
            expect(result.every(v => v === 0)).toBe(true);
        });

        test('should return zero vector for null input', async () => {
            const result = await generateEmbedding(null);
            expect(result).toHaveLength(EMBEDDING_DIMENSIONS);
            expect(result.every(v => v === 0)).toBe(true);
        });

        test('should return zero vector for non-string input', async () => {
            const result = await generateEmbedding(123);
            expect(result).toHaveLength(EMBEDDING_DIMENSIONS);
        });

        test('should call API with correct parameters', async () => {
            const mockEmbedding = new Array(EMBEDDING_DIMENSIONS).fill(0.1);
            axios.post.mockResolvedValue({
                data: { data: [{ embedding: mockEmbedding, index: 0 }] }
            });

            const result = await generateEmbedding('hello world');

            expect(axios.post).toHaveBeenCalledTimes(1);
            const [url, body] = axios.post.mock.calls[0];
            expect(url).toContain('/v1/embeddings');
            expect(body.model).toBe(EMBEDDING_MODEL);
            expect(body.input).toBe('hello world');
            expect(result).toEqual(mockEmbedding);
        });

        test('should truncate long text to 32000 chars', async () => {
            const longText = 'a'.repeat(50000);
            const mockEmbedding = new Array(EMBEDDING_DIMENSIONS).fill(0.1);
            axios.post.mockResolvedValue({
                data: { data: [{ embedding: mockEmbedding, index: 0 }] }
            });

            await generateEmbedding(longText);

            const sentInput = axios.post.mock.calls[0][1].input;
            expect(sentInput.length).toBe(32000);
        });

        test('should return zero vector on API error', async () => {
            axios.post.mockRejectedValue(new Error('Network error'));

            const result = await generateEmbedding('hello');
            expect(result).toHaveLength(EMBEDDING_DIMENSIONS);
            expect(result.every(v => v === 0)).toBe(true);
        });

        test('should return zero vector on invalid API response', async () => {
            axios.post.mockResolvedValue({ data: { data: [] } });

            const result = await generateEmbedding('hello');
            expect(result).toHaveLength(EMBEDDING_DIMENSIONS);
            expect(result.every(v => v === 0)).toBe(true);
        });

        test('should handle whitespace-only input', async () => {
            const result = await generateEmbedding('   ');
            expect(result).toHaveLength(EMBEDDING_DIMENSIONS);
            expect(result.every(v => v === 0)).toBe(true);
        });
    });

    // ─── generateBatchEmbeddings ────────────────────────
    
    describe('generateBatchEmbeddings', () => {
        test('should return empty array for empty input', async () => {
            const result = await generateBatchEmbeddings([]);
            expect(result).toEqual([]);
        });

        test('should return empty array for null input', async () => {
            const result = await generateBatchEmbeddings(null);
            expect(result).toEqual([]);
        });

        test('should process batch and return embeddings in order', async () => {
            const mockEmb1 = new Array(EMBEDDING_DIMENSIONS).fill(0.1);
            const mockEmb2 = new Array(EMBEDDING_DIMENSIONS).fill(0.2);
            axios.post.mockResolvedValue({
                data: {
                    data: [
                        { embedding: mockEmb1, index: 0 },
                        { embedding: mockEmb2, index: 1 }
                    ]
                }
            });

            const result = await generateBatchEmbeddings(['text1', 'text2']);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(mockEmb1);
            expect(result[1]).toEqual(mockEmb2);
        });

        test('should handle unordered API response', async () => {
            const mockEmb1 = new Array(EMBEDDING_DIMENSIONS).fill(0.1);
            const mockEmb2 = new Array(EMBEDDING_DIMENSIONS).fill(0.2);
            axios.post.mockResolvedValue({
                data: {
                    data: [
                        { embedding: mockEmb2, index: 1 },
                        { embedding: mockEmb1, index: 0 }
                    ]
                }
            });

            const result = await generateBatchEmbeddings(['text1', 'text2']);
            expect(result[0]).toEqual(mockEmb1);
            expect(result[1]).toEqual(mockEmb2);
        });

        test('should return zero vectors on batch API error', async () => {
            axios.post.mockRejectedValue(new Error('Batch failed'));

            const result = await generateBatchEmbeddings(['text1', 'text2']);
            expect(result).toHaveLength(2);
            expect(result[0].every(v => v === 0)).toBe(true);
        });

        test('should handle null texts in batch', async () => {
            const mockEmb = new Array(EMBEDDING_DIMENSIONS).fill(0.1);
            axios.post.mockResolvedValue({
                data: { data: [{ embedding: mockEmb, index: 0 }] }
            });

            const result = await generateBatchEmbeddings([null]);
            expect(result).toHaveLength(1);
        });
    });

    // ─── cosineSimilarity ───────────────────────────────
    
    describe('cosineSimilarity', () => {
        test('identical vectors should have similarity 1', () => {
            expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBe(1);
        });

        test('orthogonal vectors should have similarity 0', () => {
            expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBe(0);
        });

        test('opposite vectors should have similarity -1', () => {
            expect(cosineSimilarity([1, 0], [-1, 0])).toBe(-1);
        });

        test('should return 0 for null inputs', () => {
            expect(cosineSimilarity(null, [1, 0])).toBe(0);
            expect(cosineSimilarity([1, 0], null)).toBe(0);
        });

        test('should return 0 for different-length vectors', () => {
            expect(cosineSimilarity([1, 0], [1, 0, 0])).toBe(0);
        });

        test('should return 0 for zero vectors', () => {
            expect(cosineSimilarity([0, 0, 0], [1, 0, 0])).toBe(0);
        });

        test('should handle similar but not identical vectors', () => {
            const sim = cosineSimilarity([1, 0.1, 0], [1, 0, 0]);
            expect(sim).toBeGreaterThan(0.99);
            expect(sim).toBeLessThan(1);
        });
    });

    // ─── findSimilar ────────────────────────────────────
    
    describe('findSimilar', () => {
        test('should return empty for null query', () => {
            expect(findSimilar(null, [])).toEqual([]);
        });

        test('should return empty for empty candidates', () => {
            expect(findSimilar([1, 0], [])).toEqual([]);
        });

        test('should find most similar candidates', () => {
            const candidates = [
                { id: 'a', vector: [1, 0, 0] },
                { id: 'b', vector: [0, 1, 0] },
                { id: 'c', vector: [0.9, 0.1, 0] }
            ];

            const results = findSimilar([1, 0, 0], candidates, 2);
            expect(results).toHaveLength(2);
            expect(results[0].id).toBe('a');
            expect(results[0].score).toBe(1);
            expect(results[1].id).toBe('c');
        });

        test('should respect topK limit', () => {
            const candidates = [
                { id: 'a', vector: [1, 0] },
                { id: 'b', vector: [0.9, 0.1] },
                { id: 'c', vector: [0.8, 0.2] }
            ];

            const results = findSimilar([1, 0], candidates, 1);
            expect(results).toHaveLength(1);
        });

        test('should sort by score descending', () => {
            const candidates = [
                { id: 'low', vector: [0, 1, 0] },
                { id: 'high', vector: [1, 0, 0] },
                { id: 'mid', vector: [0.5, 0.5, 0] }
            ];

            const results = findSimilar([1, 0, 0], candidates, 3);
            expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
            expect(results[1].score).toBeGreaterThanOrEqual(results[2].score);
        });

        test('should default topK to 5', () => {
            const candidates = Array.from({ length: 10 }, (_, i) => ({
                id: `doc${i}`,
                vector: [Math.random(), Math.random()]
            }));

            const results = findSimilar([1, 0], candidates);
            expect(results.length).toBeLessThanOrEqual(5);
        });
    });
});
