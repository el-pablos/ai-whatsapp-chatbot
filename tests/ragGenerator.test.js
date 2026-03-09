/**
 * Tests for ragGenerator
 */

const axios = require('axios');
jest.mock('axios');

const {
    generate,
    formatAnswer,
    generateWithCitations,
    MAX_ANSWER_LENGTH,
    RAG_TEMPERATURE
} = require('../src/rag/ragGenerator');

describe('ragGenerator', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ─── Constants ───────────────────────────────────────

    describe('constants', () => {
        test('MAX_ANSWER_LENGTH should be 3800', () => {
            expect(MAX_ANSWER_LENGTH).toBe(3800);
        });

        test('RAG_TEMPERATURE should be 0.4', () => {
            expect(RAG_TEMPERATURE).toBe(0.4);
        });
    });

    // ─── generate ───────────────────────────────────────

    describe('generate', () => {
        test('should return empty for null query', async () => {
            const result = await generate(null, '');
            expect(result.answer).toBe('');
            expect(result.fromContext).toBe(false);
        });

        test('should call API with context when provided', async () => {
            axios.post.mockResolvedValue({
                data: {
                    choices: [{ message: { content: 'AI answer here' } }],
                    usage: { total_tokens: 100 }
                }
            });

            const result = await generate('Apa itu RAG?', 'RAG adalah retrieval augmented generation.');
            expect(result.answer).toBe('AI answer here');
            expect(result.fromContext).toBe(true);
            expect(result.tokensUsed).toBe(100);

            const [, body] = axios.post.mock.calls[0];
            expect(body.messages[1].content).toContain('konteks dokumen');
        });

        test('should call API without context', async () => {
            axios.post.mockResolvedValue({
                data: {
                    choices: [{ message: { content: 'No context answer' } }],
                    usage: { total_tokens: 50 }
                }
            });

            const result = await generate('Apa itu AI?', '');
            expect(result.fromContext).toBe(false);
        });

        test('should truncate long answers', async () => {
            const longAnswer = 'a'.repeat(5000);
            axios.post.mockResolvedValue({
                data: {
                    choices: [{ message: { content: longAnswer } }],
                    usage: { total_tokens: 2000 }
                }
            });

            const result = await generate('test', 'context');
            expect(result.answer.length).toBeLessThan(5000);
            expect(result.answer).toContain('dipotong');
        });

        test('should return fallback on API error', async () => {
            axios.post.mockRejectedValue(new Error('API down'));

            const result = await generate('test', 'context');
            expect(result.answer).toBeTruthy();
            expect(result.fromContext).toBe(false);
            expect(result.tokensUsed).toBe(0);
        });

        test('should handle empty API response', async () => {
            axios.post.mockResolvedValue({
                data: { choices: [{ message: { content: '' } }] }
            });

            const result = await generate('test', '');
            expect(result.answer).toBe('');
        });

        test('should use custom system prompt', async () => {
            axios.post.mockResolvedValue({
                data: { choices: [{ message: { content: 'custom' } }] }
            });

            await generate('test', '', { systemPrompt: 'Custom system prompt' });

            const [, body] = axios.post.mock.calls[0];
            expect(body.messages[0].content).toBe('Custom system prompt');
        });

        test('should pass temperature setting', async () => {
            axios.post.mockResolvedValue({
                data: { choices: [{ message: { content: 'ok' } }] }
            });

            await generate('test', '');

            const [, body] = axios.post.mock.calls[0];
            expect(body.temperature).toBe(RAG_TEMPERATURE);
        });
    });

    // ─── formatAnswer ───────────────────────────────────

    describe('formatAnswer', () => {
        test('should return empty for null', () => {
            expect(formatAnswer(null)).toBe('');
        });

        test('should return answer as-is without stats', () => {
            expect(formatAnswer('hello')).toBe('hello');
        });

        test('should append stats when showStats=true', () => {
            const result = formatAnswer('answer', { found: 3, maxScore: 0.92 }, true);
            expect(result).toContain('📚');
            expect(result).toContain('3 dokumen');
            expect(result).toContain('92%');
        });

        test('should not append stats when found=0', () => {
            const result = formatAnswer('answer', { found: 0 }, true);
            expect(result).toBe('answer');
        });

        test('should not append stats when showStats=false', () => {
            const result = formatAnswer('answer', { found: 3 }, false);
            expect(result).toBe('answer');
        });
    });

    // ─── generateWithCitations ──────────────────────────

    describe('generateWithCitations', () => {
        test('should generate without citations for empty chunks', async () => {
            axios.post.mockResolvedValue({
                data: { choices: [{ message: { content: 'no docs' } }] }
            });

            const result = await generateWithCitations('test', []);
            expect(result.answer).toBe('no docs');
            expect(result.citations).toEqual([]);
        });

        test('should generate with citation markers', async () => {
            axios.post.mockResolvedValue({
                data: {
                    choices: [{ message: { content: 'Answer with [1] reference' } }],
                    usage: { total_tokens: 150 }
                }
            });

            const chunks = [
                { text: 'chunk content', score: 0.9, metadata: { source: 'doc1.pdf', documentId: 'doc1' } }
            ];

            const result = await generateWithCitations('question', chunks);
            expect(result.citations).toHaveLength(1);
            expect(result.citations[0].number).toBe(1);
            expect(result.citations[0].source).toBe('doc1.pdf');
        });

        test('should build context with source numbers', async () => {
            axios.post.mockResolvedValue({
                data: { choices: [{ message: { content: 'cited answer' } }] }
            });

            const chunks = [
                { text: 'first', score: 0.9, metadata: { source: 'a' } },
                { text: 'second', score: 0.8, metadata: { source: 'b' } }
            ];

            await generateWithCitations('q', chunks);

            const [, body] = axios.post.mock.calls[0];
            expect(body.messages[1].content).toContain('[1]');
            expect(body.messages[1].content).toContain('[2]');
        });

        test('should include scores in citations', async () => {
            axios.post.mockResolvedValue({
                data: { choices: [{ message: { content: 'ok' } }] }
            });

            const chunks = [
                { text: 'content', score: 0.85, metadata: { source: 'src', heading: 'Title' } }
            ];

            const result = await generateWithCitations('q', chunks);
            expect(result.citations[0].score).toBe(0.85);
            expect(result.citations[0].heading).toBe('Title');
        });
    });
});
