/**
 * Tests for Search Aggregator module
 */

const {
    aggregateSearch,
    deduplicateResults,
    calculateConfidence,
    fetchWikipediaSummary,
} = require('../src/searchAggregator');

// Mock webSearchHandler
jest.mock('../src/webSearchHandler', () => ({
    webSearch: jest.fn(),
    axiosGetWithRetry: jest.fn(),
}));

const { webSearch, axiosGetWithRetry } = require('../src/webSearchHandler');

beforeEach(() => {
    jest.clearAllMocks();
});

describe('searchAggregator', () => {
    describe('aggregateSearch()', () => {
        test('return format yang benar', async () => {
            webSearch.mockResolvedValue({
                hasContent: true,
                source: 'duckduckgo',
                abstract: 'Test abstract content',
                heading: 'Test',
                abstractURL: 'https://example.com',
                abstractSource: 'Wikipedia',
            });

            const result = await aggregateSearch('test query');
            expect(result).toHaveProperty('results');
            expect(result).toHaveProperty('sources');
            expect(result).toHaveProperty('confidence');
            expect(result).toHaveProperty('timestamp');
            expect(Array.isArray(result.results)).toBe(true);
            expect(Array.isArray(result.sources)).toBe(true);
            expect(typeof result.confidence).toBe('number');
            expect(result.timestamp).toBeInstanceOf(Date);
        });

        test('hasil di-deduplicate', async () => {
            webSearch.mockResolvedValue({
                hasContent: true,
                source: 'duckduckgo',
                abstract: 'Same content here',
                heading: 'Test',
                relatedTopics: [
                    { text: 'Same content here', url: 'https://a.com' },
                    { text: 'Different content', url: 'https://b.com' },
                ],
            });

            const result = await aggregateSearch('test query');
            // dedup should remove the duplicate "Same content here"
            const snippets = result.results.map(r => r.snippet.substring(0, 20));
            const uniqueSnippets = [...new Set(snippets)];
            expect(snippets.length).toBe(uniqueSnippets.length);
        });

        test('confidence score calculation', async () => {
            webSearch.mockResolvedValue({
                hasContent: true,
                source: 'duckduckgo',
                abstract: 'Some substantial content that is more than fifty characters to be considered substantial enough for scoring',
                heading: 'Test',
                abstractURL: 'https://example.com',
            });

            const result = await aggregateSearch('test');
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
        });

        test('handling ketika semua source gagal', async () => {
            webSearch.mockRejectedValue(new Error('Network error'));

            const result = await aggregateSearch('test');
            expect(result.results).toHaveLength(0);
            expect(result.confidence).toBe(0);
        });

        test('handling timeout', async () => {
            webSearch.mockImplementation(() => new Promise((_, reject) =>
                setTimeout(() => reject(new Error('timeout')), 20000)
            ));

            const result = await aggregateSearch('test', { timeout: 100 });
            expect(result.results).toHaveLength(0);
        }, 10000);

        test('results merge dari multiple sources', async () => {
            webSearch.mockResolvedValue({
                hasContent: true,
                source: 'duckduckgo',
                abstract: 'DuckDuckGo abstract result',
                heading: 'Test',
                googleSnippets: [
                    { title: 'Google Result', snippet: 'Google snippet content', url: 'https://google.com/result' },
                ],
            });

            const result = await aggregateSearch('test');
            expect(result.results.length).toBeGreaterThanOrEqual(2);
        });

        test('timestamp generation', async () => {
            webSearch.mockResolvedValue({ hasContent: false });
            const before = new Date();
            const result = await aggregateSearch('test');
            const after = new Date();
            expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(result.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        test('domain-specific URL fetch (wikipedia)', async () => {
            webSearch.mockResolvedValue({ hasContent: false });
            axiosGetWithRetry.mockResolvedValue({
                data: { title: 'Indonesia', extract: 'Indonesia is a country', content_urls: { desktop: { page: 'https://id.wikipedia.org/wiki/Indonesia' } } },
            });

            const result = await aggregateSearch('wikipedia Indonesia');
            expect(result.sources).toContain('wikipedia');
        });
    });

    describe('deduplicateResults()', () => {
        test('remove duplicate snippets', () => {
            const results = [
                { title: 'A', snippet: 'same content here for test' },
                { title: 'B', snippet: 'same content here for test' },
                { title: 'C', snippet: 'different content entirely' },
            ];
            const deduped = deduplicateResults(results);
            expect(deduped).toHaveLength(2);
        });
    });

    describe('calculateConfidence()', () => {
        test('return 0 for empty results', () => {
            expect(calculateConfidence([], [])).toBe(0);
        });

        test('higher confidence with more sources', () => {
            const results = [{ snippet: 'a'.repeat(60), url: 'https://x.com' }];
            const single = calculateConfidence(results, ['duckduckgo']);
            const multi = calculateConfidence(results, ['duckduckgo', 'google']);
            expect(multi).toBeGreaterThan(single);
        });
    });
});
