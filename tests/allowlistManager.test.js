/**
 * Tests for Allowlist Manager
 */

jest.mock('../src/database', () => ({
    addToAllowlist: jest.fn(),
    removeFromAllowlist: jest.fn(),
    toggleAllowlist: jest.fn(),
    getAllowlist: jest.fn(),
    refreshAllowlistCache: jest.fn(),
    getActiveAllowlistCount: jest.fn(),
    getTotalAllowlistCount: jest.fn(),
    normalizePhoneNumber: jest.fn((p) => p.replace(/\D/g, '').replace(/^0/, '62')),
    isPhoneAllowed: jest.fn(() => true),
}));

jest.mock('../src/userProfileHelper', () => ({
    isOwnerPhone: jest.fn((jid) => jid.includes('6282210819939')),
    OWNER_PHONES: ['6282210819939', '6285817378442'],
}));

const {
    isAllowed,
    addNumber,
    removeNumber,
    toggleNumber,
    getAll,
    getStats,
    refreshCache,
} = require('../src/allowlistManager');

const db = require('../src/database');
const { isOwnerPhone } = require('../src/userProfileHelper');

describe('Allowlist Manager', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Re-apply mock implementations after resetMocks
        db.normalizePhoneNumber.mockImplementation((p) => p.replace(/\D/g, '').replace(/^0/, '62'));
        db.isPhoneAllowed.mockReturnValue(true);
        db.getAllowlist.mockReturnValue([]);
        db.getActiveAllowlistCount.mockReturnValue(0);
        db.getTotalAllowlistCount.mockReturnValue(0);
        isOwnerPhone.mockImplementation((jid) => jid.includes('6282210819939'));
    });

    describe('isAllowed()', () => {
        test('should always allow owner', () => {
            expect(isAllowed('6282210819939@s.whatsapp.net')).toBe(true);
        });

        test('should allow everyone when allowlist is empty (totalCount=0)', () => {
            db.getTotalAllowlistCount.mockReturnValue(0);
            expect(isAllowed('6289999999999@s.whatsapp.net')).toBe(true);
        });

        test('should check allowlist when entries exist (totalCount>0)', () => {
            db.getTotalAllowlistCount.mockReturnValue(5);
            db.isPhoneAllowed.mockReturnValue(false);
            expect(isAllowed('6289999999999@s.whatsapp.net')).toBe(false);
        });

        test('should allow when phone is in allowlist', () => {
            db.getTotalAllowlistCount.mockReturnValue(5);
            db.isPhoneAllowed.mockReturnValue(true);
            expect(isAllowed('6289999999999@s.whatsapp.net')).toBe(true);
        });

        test('should BLOCK on DB error (fail-close)', () => {
            db.getTotalAllowlistCount.mockImplementation(() => { throw new Error('DB locked'); });
            expect(isAllowed('6289999999999@s.whatsapp.net')).toBe(false);
        });

        test('should still allow owner even on DB error', () => {
            db.getTotalAllowlistCount.mockImplementation(() => { throw new Error('DB locked'); });
            expect(isAllowed('6282210819939@s.whatsapp.net')).toBe(true);
        });

        test('should block when all entries are inactive but totalCount>0', () => {
            db.getTotalAllowlistCount.mockReturnValue(3);
            db.getActiveAllowlistCount.mockReturnValue(0);
            db.isPhoneAllowed.mockReturnValue(false);
            expect(isAllowed('6289999999999@s.whatsapp.net')).toBe(false);
        });

        test('should handle group JID', () => {
            const result = isAllowed('120363012345678901@g.us');
            expect(typeof result).toBe('boolean');
        });

        test('should return false for empty/null JID', () => {
            expect(isAllowed('')).toBe(false);
            expect(isAllowed(null)).toBe(false);
            expect(isAllowed(undefined)).toBe(false);
        });
    });

    describe('addNumber()', () => {
        test('should call database addToAllowlist', async () => {
            db.addToAllowlist.mockReturnValue({ id: 1 });
            const result = await addNumber('08123456789', 'Test', 'admin');
            expect(db.addToAllowlist).toHaveBeenCalled();
            expect(result).toBeTruthy();
        });
    });

    describe('removeNumber()', () => {
        test('should call database removeFromAllowlist', async () => {
            db.removeFromAllowlist.mockReturnValue(true);
            const result = await removeNumber('6281234567890');
            expect(db.removeFromAllowlist).toHaveBeenCalled();
        });
    });

    describe('toggleNumber()', () => {
        test('should call database toggleAllowlist', async () => {
            db.toggleAllowlist.mockReturnValue(true);
            const result = await toggleNumber('6281234567890', true);
            expect(db.toggleAllowlist).toHaveBeenCalled();
        });
    });

    describe('getAll()', () => {
        test('should return allowlist entries', () => {
            db.getAllowlist.mockReturnValue([{ phone_number: '6281234567890', is_active: true }]);
            const result = getAll();
            expect(result).toHaveLength(1);
        });
    });

    describe('getStats()', () => {
        test('should return stats object', () => {
            db.getAllowlist.mockReturnValue([
                { phone_number: '6281234567890', is_active: true },
                { phone_number: '6289999999999', is_active: false },
            ]);
            const result = getStats();
            expect(result).toHaveProperty('total');
            expect(result).toHaveProperty('active');
        });
    });

    describe('refreshCache()', () => {
        test('should call refreshAllowlistCache', () => {
            refreshCache();
            expect(db.refreshAllowlistCache).toHaveBeenCalled();
        });
    });
});
