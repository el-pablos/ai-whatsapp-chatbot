/**
 * Tests for Fact Checker module
 */

const { verifyWithInternet, parseVerificationResponse } = require('../src/factChecker');
const axios = require('axios');

jest.mock('axios');

beforeEach(() => {
    jest.clearAllMocks();
});

describe('factChecker', () => {
    describe('verifyWithInternet()', () => {
        test('return unknown kalo input kosong', async () => {
            const result = await verifyWithInternet('', null, '');
            expect(result.verified).toBe('unknown');
            expect(result.confidence).toBe(0);
            expect(result.updatedResponse).toBeNull();
        });

        test('return unknown kalo search results kosong', async () => {
            const result = await verifyWithInternet('test response', { results: [] }, 'test');
            expect(result.verified).toBe('unknown');
            expect(result.confidence).toBe(0);
        });

        test('parse verified response dari API', async () => {
            axios.post.mockResolvedValue({
                data: {
                    choices: [{
                        message: {
                            content: `VERIFIED: true
CORRECTIONS: none
CONFIDENCE: 0.9
UPDATED_RESPONSE: none
SOURCES: Wikipedia, DuckDuckGo`,
                        },
                    }],
                },
            });

            const searchResults = {
                results: [{ title: 'Test', snippet: 'Test snippet', url: 'https://test.com', source: 'DuckDuckGo' }],
            };

            const result = await verifyWithInternet('AI says hello', searchResults, 'greeting');
            expect(result.verified).toBe('true');
            expect(result.confidence).toBe(0.9);
            expect(result.updatedResponse).toBeNull();
            expect(result.sources).toContain('Wikipedia');
        });

        test('parse partial verification with update', async () => {
            axios.post.mockResolvedValue({
                data: {
                    choices: [{
                        message: {
                            content: `VERIFIED: partial
CORRECTIONS: Harga sebenarnya 50rb bukan 40rb
CONFIDENCE: 0.7
UPDATED_RESPONSE: Harga emas sekarang sekitar 50rb per gram ya cuy
SOURCES: Kitco, Bloomberg`,
                        },
                    }],
                },
            });

            const searchResults = {
                results: [{ title: 'Gold', snippet: 'Gold price today', source: 'Kitco' }],
            };

            const result = await verifyWithInternet('Harga emas 40rb', searchResults, 'harga emas');
            expect(result.verified).toBe('partial');
            expect(result.corrections).toContain('50rb');
            expect(result.updatedResponse).toContain('50rb');
            expect(result.confidence).toBe(0.7);
        });

        test('handle API error gracefully', async () => {
            axios.post.mockRejectedValue(new Error('Connection refused'));

            const searchResults = {
                results: [{ title: 'Test', snippet: 'Test', source: 'DuckDuckGo' }],
            };

            const result = await verifyWithInternet('test', searchResults, 'test');
            expect(result.verified).toBe('unknown');
            expect(result.confidence).toBe(0);
        });

        test('confidence di-clamp antara 0 dan 1', async () => {
            axios.post.mockResolvedValue({
                data: {
                    choices: [{
                        message: {
                            content: `VERIFIED: true
CORRECTIONS: none
CONFIDENCE: 5.0
UPDATED_RESPONSE: none
SOURCES: test`,
                        },
                    }],
                },
            });

            const searchResults = {
                results: [{ title: 'Test', snippet: 'Test', source: 'Test' }],
            };

            const result = await verifyWithInternet('test', searchResults, 'test');
            expect(result.confidence).toBeLessThanOrEqual(1.0);
        });
    });

    describe('parseVerificationResponse()', () => {
        test('parse semua field dengan benar', () => {
            const text = `VERIFIED: false
CORRECTIONS: Data sudah outdated
CONFIDENCE: 0.4
UPDATED_RESPONSE: Ini data terbaru bre
SOURCES: CNN, BBC`;

            const result = parseVerificationResponse(text, { results: [] });
            expect(result.verified).toBe('false');
            expect(result.corrections).toContain('outdated');
            expect(result.confidence).toBe(0.4);
            expect(result.updatedResponse).toBe('Ini data terbaru bre');
            expect(result.sources).toEqual(['CNN', 'BBC']);
        });

        test('fallback sources dari search results kalo parsing gagal', () => {
            const text = 'some unparseable stuff';
            const searchResults = {
                results: [
                    { source: 'DuckDuckGo' },
                    { source: 'Wikipedia' },
                ],
            };

            const result = parseVerificationResponse(text, searchResults);
            expect(result.sources).toContain('DuckDuckGo');
            expect(result.sources).toContain('Wikipedia');
        });
    });
});
