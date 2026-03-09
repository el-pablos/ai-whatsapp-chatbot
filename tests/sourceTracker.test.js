/**
 * Tests for Source Tracker module
 */

const { trackSource, getSources, getRecentSources } = require('../src/sourceTracker');

jest.mock('../src/database', () => ({
    saveVerification: jest.fn(),
    getVerification: jest.fn(),
    getRecentVerifications: jest.fn(),
}));

const { saveVerification, getVerification, getRecentVerifications } = require('../src/database');

beforeEach(() => {
    jest.clearAllMocks();
});

describe('sourceTracker', () => {
    describe('trackSource()', () => {
        test('simpan verification data ke database', () => {
            trackSource('chat123', 'msg456', {
                query: 'harga bitcoin',
                sources: ['CoinGecko', 'Binance'],
                confidence: 0.85,
                verified: true,
            });

            expect(saveVerification).toHaveBeenCalledWith(
                'chat123', 'msg456', 'harga bitcoin',
                ['CoinGecko', 'Binance'], 0.85, true,
            );
        });

        test('handle default values kalo verificationData kosong', () => {
            trackSource('chat123', 'msg456');
            expect(saveVerification).toHaveBeenCalledWith('chat123', 'msg456', '', [], 0, false);
        });

        test('handle error gracefully', () => {
            saveVerification.mockImplementation(() => { throw new Error('DB error'); });
            // Should not throw
            expect(() => trackSource('chat123', 'msg456', { query: 'test' })).not.toThrow();
        });
    });

    describe('getSources()', () => {
        test('ambil source dari database', () => {
            getVerification.mockReturnValue({ query: 'test', sources: '["DuckDuckGo"]' });
            const result = getSources('chat123', 'msg456');
            expect(getVerification).toHaveBeenCalledWith('chat123', 'msg456');
            expect(result).toHaveProperty('query');
        });
    });

    describe('getRecentSources()', () => {
        test('ambil recent verifications', () => {
            getRecentVerifications.mockReturnValue([
                { query: 'a', confidence: 0.9 },
                { query: 'b', confidence: 0.7 },
            ]);
            const result = getRecentSources('chat123', 5);
            expect(getRecentVerifications).toHaveBeenCalledWith('chat123', 5);
            expect(result).toHaveLength(2);
        });
    });
});
