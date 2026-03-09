/**
 * Tests for Image Gen Handler
 */

jest.mock('axios');
const axios = require('axios');

const {
    isImageGenAvailable,
    generateImage,
    downloadImageBuffer,
    parseImagineCommand,
} = require('../src/imageGenHandler');

describe('Image Gen Handler', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.OPENAI_API_KEY;
    });

    describe('isImageGenAvailable', () => {
        test('should return false without OPENAI_API_KEY', () => {
            expect(isImageGenAvailable()).toBe(false);
        });

        test('should return true with OPENAI_API_KEY', () => {
            process.env.OPENAI_API_KEY = 'test-key';
            expect(isImageGenAvailable()).toBe(true);
        });
    });

    describe('generateImage', () => {
        test('should return error without API key', async () => {
            const result = await generateImage('a cat');
            expect(result.success).toBe(false);
            expect(result.error).toContain('OPENAI_API_KEY');
        });

        test('should return error for empty prompt', async () => {
            process.env.OPENAI_API_KEY = 'test-key';
            const result = await generateImage('');
            expect(result.success).toBe(false);
        });

        test('should generate image successfully', async () => {
            process.env.OPENAI_API_KEY = 'test-key';
            axios.post.mockResolvedValue({
                data: {
                    data: [{
                        url: 'https://oai.com/image.png',
                        revised_prompt: 'A cute cat playing guitar',
                    }],
                },
            });
            const result = await generateImage('a cat playing guitar');
            expect(result.success).toBe(true);
            expect(result.url).toBe('https://oai.com/image.png');
            expect(result.revisedPrompt).toBeDefined();
        });

        test('should handle API error', async () => {
            process.env.OPENAI_API_KEY = 'test-key';
            axios.post.mockRejectedValue({
                response: { data: { error: { message: 'Content policy violation' } } },
                message: 'Request failed',
            });
            const result = await generateImage('bad prompt');
            expect(result.success).toBe(false);
            expect(result.error).toContain('Content policy violation');
        });

        test('should handle missing URL in response', async () => {
            process.env.OPENAI_API_KEY = 'test-key';
            axios.post.mockResolvedValue({ data: { data: [{}] } });
            const result = await generateImage('a cat');
            expect(result.success).toBe(false);
        });
    });

    describe('downloadImageBuffer', () => {
        test('should download image as buffer', async () => {
            axios.get.mockResolvedValue({ data: Buffer.from('fake-image') });
            const result = await downloadImageBuffer('https://example.com/img.png');
            expect(Buffer.isBuffer(result)).toBe(true);
        });
    });

    describe('parseImagineCommand', () => {
        test('should parse /imagine command', () => {
            const result = parseImagineCommand('/imagine a cat playing guitar');
            expect(result).toEqual({ prompt: 'a cat playing guitar', size: '1024x1024' });
        });

        test('should parse with --size landscape', () => {
            const result = parseImagineCommand('/imagine --size landscape a sunset');
            expect(result.size).toBe('1792x1024');
            expect(result.prompt).toBe('a sunset');
        });

        test('should parse with --size portrait', () => {
            const result = parseImagineCommand('/imagine a portrait --size portrait');
            expect(result.size).toBe('1024x1792');
        });

        test('should return null for empty', () => {
            expect(parseImagineCommand('')).toBeNull();
            expect(parseImagineCommand(null)).toBeNull();
        });

        test('should return null for non-imagine command', () => {
            expect(parseImagineCommand('/other test')).toBeNull();
        });
    });
});
