/**
 * Tests for GIF Handler
 */

jest.mock('axios');
const axios = require('axios');

const {
    searchTenor,
    searchGiphy,
    searchGif,
    parseGifCommand,
    isGifAvailable,
} = require('../src/gifHandler');

describe('GIF Handler', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.TENOR_API_KEY;
        delete process.env.GIPHY_API_KEY;
    });

    describe('searchTenor', () => {
        test('should return empty without API key', async () => {
            const result = await searchTenor('cat');
            expect(result).toEqual([]);
        });

        test('should search with API key', async () => {
            process.env.TENOR_API_KEY = 'test-key';
            axios.get.mockResolvedValue({
                data: {
                    results: [{
                        media_formats: { gif: { url: 'https://tenor.com/cat.gif' }, tinygif: { url: 'https://tenor.com/cat-sm.gif' } },
                        title: 'Cat',
                    }],
                },
            });
            const result = await searchTenor('cat');
            expect(result).toHaveLength(1);
            expect(result[0].url).toContain('tenor.com');
        });
    });

    describe('searchGiphy', () => {
        test('should return empty without API key', async () => {
            const result = await searchGiphy('cat');
            expect(result).toEqual([]);
        });

        test('should search with API key', async () => {
            process.env.GIPHY_API_KEY = 'test-key';
            axios.get.mockResolvedValue({
                data: {
                    data: [{
                        images: { original: { url: 'https://giphy.com/cat.gif' }, fixed_height_small: { url: 'https://giphy.com/cat-sm.gif' } },
                        title: 'Cat',
                    }],
                },
            });
            const result = await searchGiphy('cat');
            expect(result).toHaveLength(1);
            expect(result[0].url).toContain('giphy.com');
        });
    });

    describe('searchGif', () => {
        test('should return empty for empty query', async () => {
            expect(await searchGif('')).toEqual([]);
        });

        test('should fallback to Giphy when Tenor fails', async () => {
            process.env.GIPHY_API_KEY = 'test-key';
            axios.get.mockResolvedValueOnce({ data: { data: [{ images: { original: { url: 'https://giphy.com/x.gif' } }, title: 'X' }] } });
            const result = await searchGif('cat');
            expect(result).toHaveLength(1);
        });

        test('should return empty when both fail', async () => {
            const result = await searchGif('cat');
            expect(result).toEqual([]);
        });
    });

    describe('parseGifCommand', () => {
        test('should parse /gif command', () => {
            expect(parseGifCommand('/gif kucing lucu')).toBe('kucing lucu');
        });

        test('should return null for non-gif command', () => {
            expect(parseGifCommand('/other test')).toBeNull();
        });

        test('should return null for empty', () => {
            expect(parseGifCommand('')).toBeNull();
            expect(parseGifCommand(null)).toBeNull();
        });

        test('should return null for /gif without query', () => {
            expect(parseGifCommand('/gif')).toBeNull();
        });
    });

    describe('isGifAvailable', () => {
        test('should return false without any API key', () => {
            expect(isGifAvailable()).toBe(false);
        });

        test('should return true with TENOR_API_KEY', () => {
            process.env.TENOR_API_KEY = 'key';
            expect(isGifAvailable()).toBe(true);
        });

        test('should return true with GIPHY_API_KEY', () => {
            process.env.GIPHY_API_KEY = 'key';
            expect(isGifAvailable()).toBe(true);
        });
    });
});
