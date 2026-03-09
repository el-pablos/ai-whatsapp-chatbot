/**
 * Tests for RSS Handler
 */

const mockParseURL = jest.fn();

jest.mock('rss-parser', () => {
    return jest.fn().mockImplementation(() => ({
        parseURL: mockParseURL,
    }));
});

jest.mock('../src/database');

const {
    subscribeFeed,
    listFeeds,
    unsubscribeFeed,
    checkFeedUpdates,
    checkUserFeeds,
    formatFeedUpdates,
    parseRssCommand,
} = require('../src/rssHandler');

const db = require('../src/database');

describe('RSS Handler', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        mockParseURL.mockResolvedValue({
            title: 'Test Feed',
            items: [
                { title: 'Article 1', link: 'https://example.com/1', pubDate: new Date().toISOString(), contentSnippet: 'Snippet 1' },
                { title: 'Article 2', link: 'https://example.com/2', pubDate: new Date().toISOString(), contentSnippet: 'Snippet 2' },
            ],
        });
        db.addRssFeed.mockReturnValue({ id: 1 });
        db.getUserFeeds.mockReturnValue([]);
        db.removeRssFeed.mockReturnValue(false);
        db.updateFeedChecked.mockReturnValue(undefined);
    });

    describe('subscribeFeed', () => {
        test('should subscribe to valid feed', async () => {
            const result = await subscribeFeed('user1', 'https://example.com/rss');
            expect(result.success).toBe(true);
            expect(result.message).toContain('Subscribed');
            expect(db.addRssFeed).toHaveBeenCalled();
        });

        test('should use custom label', async () => {
            const result = await subscribeFeed('user1', 'https://example.com/rss', 'My Feed');
            expect(result.success).toBe(true);
            expect(db.addRssFeed).toHaveBeenCalledWith('user1', 'https://example.com/rss', 'My Feed');
        });

        test('should fail for empty URL', async () => {
            const result = await subscribeFeed('user1', '');
            expect(result.success).toBe(false);
        });
    });

    describe('listFeeds', () => {
        test('should return empty message when no feeds', () => {
            db.getUserFeeds.mockReturnValue([]);
            const result = listFeeds('user1');
            expect(result).toContain('Belum subscribe');
        });

        test('should format feed list', () => {
            db.getUserFeeds.mockReturnValue([
                { id: 1, label: 'Feed 1', url: 'https://a.com/rss' },
                { id: 2, label: 'Feed 2', url: 'https://b.com/rss' },
            ]);
            const result = listFeeds('user1');
            expect(result).toContain('Feed 1');
            expect(result).toContain('Feed 2');
            expect(result).toContain('https://a.com/rss');
        });
    });

    describe('unsubscribeFeed', () => {
        test('should unsubscribe existing feed', () => {
            db.removeRssFeed.mockReturnValue(true);
            const result = unsubscribeFeed('user1', 1);
            expect(result.success).toBe(true);
        });

        test('should fail for nonexistent feed', () => {
            db.removeRssFeed.mockReturnValue(false);
            const result = unsubscribeFeed('user1', 999);
            expect(result.success).toBe(false);
        });
    });

    describe('checkFeedUpdates', () => {
        test('should return new items since last check', async () => {
            const yesterday = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
            const result = await checkFeedUpdates('https://example.com/rss', yesterday);
            expect(result.length).toBeGreaterThan(0);
            expect(result[0]).toHaveProperty('title');
            expect(result[0]).toHaveProperty('link');
        });

        test('should use 24h default when no lastChecked', async () => {
            const result = await checkFeedUpdates('https://example.com/rss', null);
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('checkUserFeeds', () => {
        test('should return empty for user with no feeds', async () => {
            db.getUserFeeds.mockReturnValue([]);
            const result = await checkUserFeeds('user1');
            expect(result).toEqual([]);
        });

        test('should check feeds and update last_checked', async () => {
            db.getUserFeeds.mockReturnValue([
                { id: 1, url: 'https://example.com/rss', label: 'Test', last_checked: null },
            ]);
            const result = await checkUserFeeds('user1');
            expect(db.updateFeedChecked).toHaveBeenCalledWith(1);
        });
    });

    describe('formatFeedUpdates', () => {
        test('should return null for empty updates', () => {
            expect(formatFeedUpdates([])).toBeNull();
        });

        test('should format updates', () => {
            const updates = [{
                feedLabel: 'Test Feed',
                items: [{ title: 'Article', link: 'https://example.com/1' }],
            }];
            const result = formatFeedUpdates(updates);
            expect(result).toContain('Test Feed');
            expect(result).toContain('Article');
        });
    });

    describe('parseRssCommand', () => {
        test('should parse /rss add', () => {
            const result = parseRssCommand('/rss add https://example.com/rss My Feed');
            expect(result).toEqual({ action: 'add', url: 'https://example.com/rss', label: 'My Feed' });
        });

        test('should parse /rss add without label', () => {
            const result = parseRssCommand('/rss add https://example.com/rss');
            expect(result).toEqual({ action: 'add', url: 'https://example.com/rss', label: null });
        });

        test('should parse /rss list', () => {
            expect(parseRssCommand('/rss list')).toEqual({ action: 'list' });
        });

        test('should parse /rss without subcommand as list', () => {
            expect(parseRssCommand('/rss')).toEqual({ action: 'list' });
        });

        test('should parse /feeds alias', () => {
            expect(parseRssCommand('/feeds')).toEqual({ action: 'list' });
        });

        test('should parse /rss remove', () => {
            expect(parseRssCommand('/rss remove 1')).toEqual({ action: 'remove', feedId: 1 });
        });

        test('should parse /rss check', () => {
            expect(parseRssCommand('/rss check')).toEqual({ action: 'check' });
        });

        test('should return null for empty', () => {
            expect(parseRssCommand('')).toBeNull();
            expect(parseRssCommand(null)).toBeNull();
        });
    });
});
