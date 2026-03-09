/**
 * Tests for URL Summarizer Handler
 */

jest.mock('axios');
const axios = require('axios');

const {
    detectUrl,
    isYoutubeUrl,
    fetchAndExtractText,
    summarizeUrl,
    formatSummary,
    URL_REGEX,
    MAX_TEXT_LENGTH,
} = require('../src/urlSummarizerHandler');

describe('URL Summarizer Handler', () => {

    beforeEach(() => jest.clearAllMocks());

    describe('detectUrl', () => {
        test('should detect single URL', () => {
            const urls = detectUrl('cek ini https://example.com dong');
            expect(urls).toEqual(['https://example.com']);
        });

        test('should detect multiple URLs', () => {
            const urls = detectUrl('https://a.com dan http://b.com');
            expect(urls).toHaveLength(2);
        });

        test('should return empty for no URLs', () => {
            expect(detectUrl('hello world')).toEqual([]);
        });

        test('should return empty for null', () => {
            expect(detectUrl(null)).toEqual([]);
        });

        test('should return empty for empty string', () => {
            expect(detectUrl('')).toEqual([]);
        });
    });

    describe('isYoutubeUrl', () => {
        test('should detect youtube.com/watch', () => {
            expect(isYoutubeUrl('https://youtube.com/watch?v=abc')).toBe(true);
        });

        test('should detect youtu.be', () => {
            expect(isYoutubeUrl('https://youtu.be/abc123')).toBe(true);
        });

        test('should detect youtube.com/shorts', () => {
            expect(isYoutubeUrl('https://youtube.com/shorts/abc')).toBe(true);
        });

        test('should NOT detect non-youtube URL', () => {
            expect(isYoutubeUrl('https://example.com')).toBe(false);
        });
    });

    describe('fetchAndExtractText', () => {
        test('should extract text from HTML', async () => {
            axios.get.mockResolvedValue({
                data: '<html><head><title>Test Page</title></head><body><p>Hello world</p></body></html>',
            });
            const result = await fetchAndExtractText('https://example.com');
            expect(result.title).toBe('Test Page');
            expect(result.text).toContain('Hello world');
        });

        test('should strip script and style tags', async () => {
            axios.get.mockResolvedValue({
                data: '<html><head><title>T</title></head><body><script>alert(1)</script><style>.x{}</style><p>Content</p></body></html>',
            });
            const result = await fetchAndExtractText('https://example.com');
            expect(result.text).not.toContain('alert');
            expect(result.text).toContain('Content');
        });

        test('should handle non-string response', async () => {
            axios.get.mockResolvedValue({ data: { json: true } });
            const result = await fetchAndExtractText('https://example.com');
            expect(result.text).toBe('');
        });

        test('should truncate long text', async () => {
            axios.get.mockResolvedValue({
                data: `<html><head><title>T</title></head><body><p>${'a'.repeat(20000)}</p></body></html>`,
            });
            const result = await fetchAndExtractText('https://example.com');
            expect(result.text.length).toBeLessThanOrEqual(MAX_TEXT_LENGTH);
        });
    });

    describe('summarizeUrl', () => {
        test('should return error for empty URL', async () => {
            const result = await summarizeUrl('');
            expect(result.success).toBe(false);
        });

        test('should reject YouTube URLs', async () => {
            const result = await summarizeUrl('https://youtube.com/watch?v=abc');
            expect(result.success).toBe(false);
            expect(result.error).toContain('YouTube');
        });

        test('should summarize valid URL', async () => {
            axios.get.mockResolvedValue({
                data: `<html><head><title>Article</title></head><body><p>${'Konten panjang. '.repeat(100)}</p></body></html>`,
            });
            const mockAiCall = jest.fn().mockResolvedValue('Ini rangkuman artikel');
            const result = await summarizeUrl('https://example.com/article', mockAiCall);
            expect(result.success).toBe(true);
            expect(result.title).toBe('Article');
            expect(mockAiCall).toHaveBeenCalled();
        });

        test('should fail when content is too short', async () => {
            axios.get.mockResolvedValue({
                data: '<html><head><title>T</title></head><body><p>Hi</p></body></html>',
            });
            const result = await summarizeUrl('https://example.com');
            expect(result.success).toBe(false);
        });

        test('should handle network errors', async () => {
            axios.get.mockRejectedValue({ code: 'ECONNREFUSED', message: 'refused' });
            const result = await summarizeUrl('https://example.com');
            expect(result.success).toBe(false);
            expect(result.error).toContain('ECONNREFUSED');
        });
    });

    describe('formatSummary', () => {
        test('should format summary with title and URL', () => {
            const result = formatSummary('My Article', 'This is a summary', 'https://example.com');
            expect(result).toContain('My Article');
            expect(result).toContain('https://example.com');
            expect(result).toContain('This is a summary');
        });
    });

    describe('constants', () => {
        test('MAX_TEXT_LENGTH should be 10000', () => {
            expect(MAX_TEXT_LENGTH).toBe(10000);
        });

        test('URL_REGEX should be a regex', () => {
            expect(URL_REGEX).toBeInstanceOf(RegExp);
        });
    });
});
