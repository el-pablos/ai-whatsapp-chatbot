/**
 * RAG Integration Tests
 *
 * Test full pipeline: ingest → query → answer
 * Uses mocked embeddingService and ragGenerator.
 */

jest.mock('../src/rag/embeddingService', () => ({
    generateEmbedding: jest.fn(),
    generateBatchEmbeddings: jest.fn(),
    cosineSimilarity: jest.fn(),
    EMBEDDING_DIMENSIONS: 1536,
}));

jest.mock('../src/rag/ragGenerator', () => ({
    generate: jest.fn(),
    formatAnswer: jest.fn((answer) => answer),
    generateWithCitations: jest.fn(),
}));

const { generateEmbedding, generateBatchEmbeddings } = require('../src/rag/embeddingService');
const { generate, generateWithCitations, formatAnswer } = require('../src/rag/ragGenerator');
const { clearStore, getStoreStats } = require('../src/rag/vectorStore');
const { ingest, query, deleteDocument, getStatus, resetPipeline, estimateIngest } = require('../src/rag/ragPipeline');

// Helper: create deterministic embedding from seed
function _makeVec(seed) {
    const vec = new Array(1536).fill(0);
    for (let i = 0; i < 100; i++) {
        vec[i] = ((seed + i) % 256) / 255;
    }
    return vec;
}

describe('RAG Integration', () => {
    beforeEach(() => {
        clearStore();

        // Setup embedding mocks
        let seedCounter = 1;
        generateEmbedding.mockImplementation(async () => _makeVec(seedCounter++));
        generateBatchEmbeddings.mockImplementation(async (texts) =>
            texts.map(() => _makeVec(seedCounter++))
        );

        // Setup generator mocks
        generate.mockImplementation(async (q, ctx) => ({
            answer: ctx ? `Jawaban konteks: ${q}` : `Jawaban umum: ${q}`,
            fromContext: !!ctx,
            tokensUsed: 100
        }));
        generateWithCitations.mockImplementation(async (q, chunks) => ({
            answer: `Jawaban sumber [1]: ${q}`,
            citations: chunks.map((c, i) => ({
                number: i + 1,
                source: c.metadata?.source || 'unknown',
                score: c.score || 0
            }))
        }));
        formatAnswer.mockImplementation((answer) => answer);
    });

    describe('Full Pipeline: ingest → query', () => {
        test('should ingest text and store chunks', async () => {
            const result = await ingest('JavaScript adalah bahasa pemrograman yang populer untuk web development.', {
                documentId: 'doc-js',
                source: 'test-doc',
                type: 'text'
            });

            expect(result.success).toBe(true);
            expect(result.chunksStored).toBeGreaterThan(0);
            expect(result.documentId).toBe('doc-js');
            expect(getStoreStats().size).toBeGreaterThan(0);
        });

        test('should query after ingest', async () => {
            await ingest('Python adalah bahasa pemrograman untuk data science.', {
                documentId: 'doc-py'
            });

            const result = await query('Apa itu Python?', { citations: true });
            expect(result.answer).toBeTruthy();
            expect(result.stats).toBeDefined();
        });

        test('should ingest markdown type', async () => {
            const md = '# Panduan Git\n\n## Clone\nGunakan git clone URL.\n\n## Branch\nBuat branch baru.';
            const result = await ingest(md, {
                documentId: 'doc-git',
                type: 'markdown'
            });

            expect(result.success).toBe(true);
            expect(result.chunksStored).toBeGreaterThan(0);
        });

        test('should ingest conversation type', async () => {
            const chat = 'User: Halo mau tanya\nAgent: Silakan\nUser: Cara refund?\nAgent: Refund 14 hari.';
            const result = await ingest(chat, {
                documentId: 'doc-chat',
                type: 'conversation'
            });

            expect(result.success).toBe(true);
        });

        test('should handle multiple documents', async () => {
            await ingest('Dokumen pertama tentang AI.', { documentId: 'doc-1' });
            await ingest('Dokumen kedua tentang SQL.', { documentId: 'doc-2' });

            expect(getStoreStats().size).toBeGreaterThanOrEqual(2);
        });

        test('should query with showStats option', async () => {
            await ingest('Dokumen tentang React framework.', { documentId: 'doc-react' });

            const result = await query('React', { showStats: true });
            expect(result.answer).toBeTruthy();
        });
    });

    describe('deleteDocument', () => {
        test('should remove vectors after delete', async () => {
            await ingest('Dokumen untuk dihapus.', {
                documentId: 'doc-delete'
            });

            const before = getStoreStats().size;
            expect(before).toBeGreaterThan(0);

            deleteDocument('doc-delete');
            expect(getStoreStats().size).toBeLessThanOrEqual(before);
        });
    });

    describe('getStatus', () => {
        test('should return pipeline status', () => {
            const status = getStatus();
            expect(status.enabled).toBe(true);
            expect(status.storeStats).toBeDefined();
        });

        test('should reflect store size', async () => {
            await ingest('Status test content.', { documentId: 'doc-status' });
            expect(getStatus().storeStats.size).toBeGreaterThan(0);
        });
    });

    describe('resetPipeline', () => {
        test('should clear all vectors', async () => {
            await ingest('Reset test content.', { documentId: 'doc-reset' });
            expect(getStoreStats().size).toBeGreaterThan(0);

            resetPipeline();
            expect(getStoreStats().size).toBe(0);
        });
    });

    describe('estimateIngest', () => {
        test('should estimate chunks', () => {
            const est = estimateIngest('x'.repeat(2000));
            expect(est.estimatedChunks).toBeGreaterThan(1);
            expect(est.textLength).toBe(2000);
            expect(est.withinLimit).toBe(true);
        });

        test('should flag oversized', () => {
            expect(estimateIngest('x'.repeat(600000)).withinLimit).toBe(false);
        });
    });

    describe('Error scenarios', () => {
        test('should handle query on empty store', async () => {
            const result = await query('Random question');
            expect(result.answer).toBeTruthy();
        });

        test('should handle empty query', async () => {
            expect((await query('')).answer).toBe('');
        });

        test('should handle null query', async () => {
            expect((await query(null)).answer).toBe('');
        });

        test('should reject empty ingest', async () => {
            expect((await ingest('')).success).toBe(false);
        });

        test('should reject oversized ingest', async () => {
            expect((await ingest('x'.repeat(600000))).success).toBe(false);
        });

        test('should handle all-zero embeddings', async () => {
            generateBatchEmbeddings.mockResolvedValue([new Array(1536).fill(0)]);

            const result = await ingest('Test zero embedding.', { documentId: 'doc-zero' });
            expect(result.success).toBe(false);
            expect(result.error).toContain('embeddings failed');
        });
    });

    describe('Cross-module flow', () => {
        test('store stats reflect ingest', async () => {
            expect(getStoreStats().size).toBe(0);
            await ingest('Stats verification doc.', { documentId: 'doc-stats' });
            expect(getStoreStats().size).toBeGreaterThan(0);
        });

        test('query works after ingest + delete', async () => {
            await ingest('Dokumen A kucing.', { documentId: 'doc-a' });
            await ingest('Dokumen B anjing.', { documentId: 'doc-b' });
            deleteDocument('doc-a');

            const result = await query('Hewan');
            expect(result.answer).toBeTruthy();
        });
    });
});
