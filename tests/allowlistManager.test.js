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
    getConfig: jest.fn(() => 'allowlist'),
    updateAllowlistEntry: jest.fn(),
}));

jest.mock('../src/userProfileHelper', () => ({
    isOwnerPhone: jest.fn(),
    OWNER_PHONES: ['6282210819939'],
}));

jest.mock('../src/lidResolver', () => ({
    resolveToPhone: jest.fn(),
    isLidJid: jest.fn(),
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
const { resolveToPhone, isLidJid } = require('../src/lidResolver');

// Helper to re-apply mocks after resetMocks: true strips them
const applyMocks = () => {
    db.normalizePhoneNumber.mockImplementation((p) => p.replace(/\D/g, '').replace(/^0/, '62'));
    db.isPhoneAllowed.mockReturnValue(true);
    db.getAllowlist.mockReturnValue([]);
    db.getActiveAllowlistCount.mockReturnValue(0);
    db.getTotalAllowlistCount.mockReturnValue(0);
    db.getConfig.mockReturnValue('allowlist');
    isOwnerPhone.mockImplementation((jid) => {
        if (!jid) return false;
        if (jid.includes('6282210819939')) return true;
        if (jid === '17685450589393701@lid') return true;
        return false;
    });
    resolveToPhone.mockImplementation((jid) => {
        if (!jid) return null;
        if (jid.endsWith('@s.whatsapp.net')) {
            let phone = jid.split('@')[0].replace(/\D/g, '');
            if (phone.startsWith('0')) phone = '62' + phone.slice(1);
            return phone;
        }
        if (jid === '17685450589393701@lid') return '6282210819939';
        if (jid === '11111@lid') return '6281234567890';
        if (jid.endsWith('@lid')) return null;
        if (jid.endsWith('@g.us')) return null;
        const cleaned = jid.replace(/\D/g, '');
        if (cleaned.length >= 10) return cleaned.startsWith('0') ? '62' + cleaned.slice(1) : cleaned;
        return null;
    });
    isLidJid.mockImplementation((jid) => jid && typeof jid === 'string' && jid.endsWith('@lid'));
};

describe('Allowlist Manager', () => {
    beforeEach(() => {
        applyMocks();
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

        // ── LID-specific tests (Bug #1 fix) ──
        test('should allow owner via @lid JID', () => {
            expect(isAllowed('17685450589393701@lid')).toBe(true);
        });

        test('should resolve known @lid and check allowlist', () => {
            db.getTotalAllowlistCount.mockReturnValue(5);
            db.isPhoneAllowed.mockReturnValue(true);
            expect(isAllowed('11111@lid')).toBe(true);
            expect(db.isPhoneAllowed).toHaveBeenCalledWith('6281234567890');
        });

        test('should BLOCK unresolved @lid when allowlist has entries', () => {
            db.getTotalAllowlistCount.mockReturnValue(5);
            expect(isAllowed('99999@lid')).toBe(false);
        });

        // ── allowlist_mode tests ──
        test('should allow everyone in open mode', () => {
            db.getConfig.mockReturnValue('open');
            db.getTotalAllowlistCount.mockReturnValue(5);
            expect(isAllowed('6289999999999@s.whatsapp.net')).toBe(true);
        });

        test('should block everyone (except owner) in closed mode', () => {
            db.getConfig.mockReturnValue('closed');
            expect(isAllowed('6289999999999@s.whatsapp.net')).toBe(false);
        });

        test('should still allow owner in closed mode', () => {
            db.getConfig.mockReturnValue('closed');
            expect(isAllowed('6282210819939@s.whatsapp.net')).toBe(true);
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
