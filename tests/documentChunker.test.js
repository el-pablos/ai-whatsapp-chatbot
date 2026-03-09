/**
 * Tests for documentChunker
 */

const {
    chunkText,
    chunkMarkdown,
    chunkConversation,
    estimateChunks,
    DEFAULT_CHUNK_SIZE,
    DEFAULT_CHUNK_OVERLAP,
    MIN_CHUNK_SIZE,
    MAX_CHUNK_SIZE,
    _getOverlapText,
    _forceSplitText
} = require('../src/rag/documentChunker');

describe('documentChunker', () => {
    // ─── Constants ───────────────────────────────────────

    describe('constants', () => {
        test('DEFAULT_CHUNK_SIZE should be 500', () => {
            expect(DEFAULT_CHUNK_SIZE).toBe(500);
        });

        test('DEFAULT_CHUNK_OVERLAP should be 100', () => {
            expect(DEFAULT_CHUNK_OVERLAP).toBe(100);
        });

        test('MIN_CHUNK_SIZE should be 50', () => {
            expect(MIN_CHUNK_SIZE).toBe(50);
        });

        test('MAX_CHUNK_SIZE should be 4000', () => {
            expect(MAX_CHUNK_SIZE).toBe(4000);
        });
    });

    // ─── chunkText ──────────────────────────────────────

    describe('chunkText', () => {
        test('should return empty for null input', () => {
            expect(chunkText(null)).toEqual([]);
        });

        test('should return empty for empty string', () => {
            expect(chunkText('')).toEqual([]);
        });

        test('should return empty for whitespace-only', () => {
            expect(chunkText('   ')).toEqual([]);
        });

        test('should chunk short text into single chunk', () => {
            const chunks = chunkText('Hello world', { chunkSize: 500 });
            expect(chunks).toHaveLength(1);
            expect(chunks[0].text).toBe('Hello world');
            expect(chunks[0].index).toBe(0);
        });

        test('should produce chunks with proper structure', () => {
            const chunks = chunkText('Test content', { documentId: 'myDoc' });
            const chunk = chunks[0];
            expect(chunk.id).toContain('myDoc');
            expect(chunk.text).toBeDefined();
            expect(chunk.index).toBe(0);
            expect(chunk.metadata).toBeDefined();
            expect(chunk.metadata.documentId).toBe('myDoc');
            expect(chunk.metadata.chunkIndex).toBe(0);
            expect(chunk.metadata.charCount).toBeGreaterThan(0);
        });

        test('should split long text into multiple chunks', () => {
            const text = Array.from({ length: 20 }, (_, i) =>
                `Paragraf ${i + 1}: ${('konten panjang ').repeat(10)}`
            ).join('\n\n');

            const chunks = chunkText(text, { chunkSize: 200, overlap: 30 });
            expect(chunks.length).toBeGreaterThan(1);
        });

        test('should respect chunkSize option', () => {
            const text = 'kata '.repeat(200);
            const chunks = chunkText(text, { chunkSize: 100, overlap: 0 });
            // Most chunks should be near chunkSize (except maybe last)
            for (let i = 0; i < chunks.length - 1; i++) {
                expect(chunks[i].text.length).toBeLessThanOrEqual(200); // some flexibility
            }
        });

        test('should handle paragraph splitting', () => {
            const text = 'Paragraf satu yang cukup panjang.\n\nParagraf dua juga panjang.\n\nParagraf tiga melengkapi.';
            const chunks = chunkText(text, { chunkSize: 60, overlap: 0 });
            expect(chunks.length).toBeGreaterThanOrEqual(2);
        });

        test('should clamp chunk size to MIN/MAX', () => {
            const text = 'a'.repeat(200);
            // chunkSize below MIN should be clamped to MIN_CHUNK_SIZE
            const chunks = chunkText(text, { chunkSize: 10, overlap: 0 });
            expect(chunks.length).toBeGreaterThanOrEqual(1);
        });

        test('should handle CRLF line endings', () => {
            const text = 'Line one\r\n\r\nLine two\r\n\r\nLine three';
            const chunks = chunkText(text, { chunkSize: 500 });
            expect(chunks.length).toBeGreaterThanOrEqual(1);
            expect(chunks[0].text).not.toContain('\r');
        });

        test('should attach custom metadata', () => {
            const chunks = chunkText('test', { metadata: { source: 'file.txt' } });
            expect(chunks[0].metadata.source).toBe('file.txt');
        });
    });

    // ─── chunkMarkdown ──────────────────────────────────

    describe('chunkMarkdown', () => {
        test('should return empty for null', () => {
            expect(chunkMarkdown(null)).toEqual([]);
        });

        test('should split by headings', () => {
            const md = '# Heading 1\nContent one.\n\n## Heading 2\nContent two.';
            const chunks = chunkMarkdown(md, { chunkSize: 500 });
            expect(chunks.length).toBeGreaterThanOrEqual(2);
        });

        test('should include heading in metadata', () => {
            const md = '# My Title\nSome content here.';
            const chunks = chunkMarkdown(md, { chunkSize: 500 });
            expect(chunks[0].metadata.heading).toBe('My Title');
        });

        test('should handle markdown without headings', () => {
            const md = 'Just some plain text without any headings.';
            const chunks = chunkMarkdown(md, { chunkSize: 500 });
            expect(chunks.length).toBeGreaterThanOrEqual(1);
        });

        test('should sub-chunk large sections', () => {
            const md = '# Big Section\n' + 'Content '.repeat(500);
            const chunks = chunkMarkdown(md, { chunkSize: 100 });
            expect(chunks.length).toBeGreaterThan(1);
        });
    });

    // ─── chunkConversation ──────────────────────────────

    describe('chunkConversation', () => {
        test('should return empty for null', () => {
            expect(chunkConversation(null)).toEqual([]);
        });

        test('should chunk conversation text', () => {
            const chat = 'Alice: Halo semua\nBob: Hai juga\nAlice: Apa kabar';
            const chunks = chunkConversation(chat, { chunkSize: 500 });
            expect(chunks.length).toBeGreaterThanOrEqual(1);
            expect(chunks[0].metadata.type).toBe('conversation');
        });

        test('should split large conversations', () => {
            const messages = Array.from({ length: 50 }, (_, i) =>
                `User${i}: Pesan nomor ${i} yang cukup panjang untuk diproses`
            ).join('\n');

            const chunks = chunkConversation(messages, { chunkSize: 100 });
            expect(chunks.length).toBeGreaterThan(1);
        });
    });

    // ─── estimateChunks ─────────────────────────────────

    describe('estimateChunks', () => {
        test('should return 0 for null', () => {
            expect(estimateChunks(null)).toBe(0);
        });

        test('should estimate single chunk for short text', () => {
            expect(estimateChunks('short', 500, 100)).toBe(1);
        });

        test('should estimate multiple chunks for long text', () => {
            const text = 'a'.repeat(2000);
            const estimate = estimateChunks(text, 500, 100);
            expect(estimate).toBeGreaterThan(1);
        });

        test('should use defaults when no size/overlap given', () => {
            const text = 'a'.repeat(1500);
            const estimate = estimateChunks(text);
            expect(estimate).toBeGreaterThan(1);
        });
    });

    // ─── Internal helpers ───────────────────────────────

    describe('_getOverlapText', () => {
        test('should return tail of text', () => {
            const result = _getOverlapText('hello world test', 10);
            expect(result.length).toBeLessThanOrEqual(10);
        });

        test('should return full text if shorter than overlap', () => {
            const result = _getOverlapText('hi', 10);
            expect(result).toBe('hi');
        });
    });

    describe('_forceSplitText', () => {
        test('should split large text into pieces', () => {
            const text = 'word '.repeat(200);
            const pieces = _forceSplitText(text, 100, 20);
            expect(pieces.length).toBeGreaterThan(1);
        });

        test('should return single piece for short text', () => {
            const pieces = _forceSplitText('short', 100, 10);
            expect(pieces).toHaveLength(1);
        });
    });
});
