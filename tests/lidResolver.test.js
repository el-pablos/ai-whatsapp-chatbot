/**
 * Unit Tests - LID Resolver Module
 *
 * Tests for:
 * 1. JID format detection (isLidJid, isPhoneJid)
 * 2. User extraction (extractUser)
 * 3. Mapping registration (registerMapping, registerFromContacts, registerFromMe)
 * 4. Resolution (resolveToPhone, resolveToPhoneOrLid)
 * 5. Edge cases (null, empty, @g.us, raw digits)
 */

const {
    isLidJid,
    isPhoneJid,
    extractUser,
    registerMapping,
    registerFromContacts,
    registerFromMe,
    resolveToPhone,
    resolveToPhoneOrLid,
    canResolve,
    getMappingCount,
    getAllMappings,
    _clearCache,
} = require('../src/lidResolver');

describe('LID Resolver Module', () => {
    beforeEach(() => {
        _clearCache();
    });

    // ═══════════════════════════════════════════════════════
    //  JID FORMAT DETECTION
    // ═══════════════════════════════════════════════════════

    describe('isLidJid', () => {
        it('should detect @lid JIDs', () => {
            expect(isLidJid('17685450589393701@lid')).toBe(true);
            expect(isLidJid('12345@lid')).toBe(true);
        });

        it('should reject non-LID JIDs', () => {
            expect(isLidJid('6282210819939@s.whatsapp.net')).toBe(false);
            expect(isLidJid('120363123456@g.us')).toBe(false);
            expect(isLidJid(null)).toBe(false);
            expect(isLidJid('')).toBe(false);
            expect(isLidJid(123)).toBe(false);
        });
    });

    describe('isPhoneJid', () => {
        it('should detect @s.whatsapp.net JIDs', () => {
            expect(isPhoneJid('6282210819939@s.whatsapp.net')).toBe(true);
        });

        it('should reject non-phone JIDs', () => {
            expect(isPhoneJid('17685450589393701@lid')).toBe(false);
            expect(isPhoneJid('120363123456@g.us')).toBe(false);
            expect(isPhoneJid(null)).toBe(false);
            expect(isPhoneJid('')).toBe(false);
        });
    });

    // ═══════════════════════════════════════════════════════
    //  USER EXTRACTION
    // ═══════════════════════════════════════════════════════

    describe('extractUser', () => {
        it('should extract user from @lid JID', () => {
            expect(extractUser('17685450589393701@lid')).toBe('17685450589393701');
        });

        it('should extract user from @s.whatsapp.net JID', () => {
            expect(extractUser('6282210819939@s.whatsapp.net')).toBe('6282210819939');
        });

        it('should strip device suffix', () => {
            expect(extractUser('6282210819939:42@s.whatsapp.net')).toBe('6282210819939');
        });

        it('should handle null/empty', () => {
            expect(extractUser(null)).toBe('');
            expect(extractUser('')).toBe('');
        });
    });

    // ═══════════════════════════════════════════════════════
    //  RESOLUTION — PHONE JIDS
    // ═══════════════════════════════════════════════════════

    describe('resolveToPhone — phone JIDs', () => {
        it('should extract phone from @s.whatsapp.net', () => {
            expect(resolveToPhone('6282210819939@s.whatsapp.net')).toBe('6282210819939');
        });

        it('should extract phone from @c.us', () => {
            expect(resolveToPhone('6282210819939@c.us')).toBe('6282210819939');
        });

        it('should normalize 08xxx to 628xxx', () => {
            expect(resolveToPhone('082210819939@s.whatsapp.net')).toBe('6282210819939');
        });

        it('should handle raw digits', () => {
            expect(resolveToPhone('6282210819939')).toBe('6282210819939');
            expect(resolveToPhone('082210819939')).toBe('6282210819939');
        });

        it('should return null for @g.us', () => {
            expect(resolveToPhone('120363123456@g.us')).toBeNull();
        });

        it('should return null for @broadcast', () => {
            expect(resolveToPhone('status@broadcast')).toBeNull();
        });

        it('should return null for null/empty', () => {
            expect(resolveToPhone(null)).toBeNull();
            expect(resolveToPhone('')).toBeNull();
        });
    });

    // ═══════════════════════════════════════════════════════
    //  RESOLUTION — LID JIDS
    // ═══════════════════════════════════════════════════════

    describe('resolveToPhone — LID JIDs', () => {
        it('should return null for unregistered LID', () => {
            expect(resolveToPhone('17685450589393701@lid')).toBeNull();
        });

        it('should resolve registered LID to phone', () => {
            registerMapping('17685450589393701@lid', '6282210819939@s.whatsapp.net');
            expect(resolveToPhone('17685450589393701@lid')).toBe('6282210819939');
        });

        it('should normalize 08 phone in mapping', () => {
            registerMapping('12345@lid', '082210819939');
            expect(resolveToPhone('12345@lid')).toBe('6282210819939');
        });
    });

    // ═══════════════════════════════════════════════════════
    //  MAPPING MANAGEMENT
    // ═══════════════════════════════════════════════════════

    describe('registerMapping', () => {
        it('should register and resolve LID-phone pair', () => {
            registerMapping('99999@lid', '6281234567890@s.whatsapp.net');
            expect(resolveToPhone('99999@lid')).toBe('6281234567890');
            expect(getMappingCount()).toBe(1);
        });

        it('should skip null/empty inputs', () => {
            const countBefore = getMappingCount();
            registerMapping(null, '6281234567890');
            registerMapping('99999@lid', null);
            registerMapping('', '6281234567890');
            expect(getMappingCount()).toBe(countBefore);
        });

        it('should skip short phone numbers', () => {
            registerMapping('99999@lid', '123');
            expect(resolveToPhone('99999@lid')).toBeNull();
        });

        it('should update existing mapping', () => {
            registerMapping('99999@lid', '6281111111111');
            registerMapping('99999@lid', '6282222222222');
            expect(resolveToPhone('99999@lid')).toBe('6282222222222');
        });
    });

    describe('registerFromContacts', () => {
        it('should register mappings from contacts array', () => {
            registerFromContacts([
                { id: '6281234567890@s.whatsapp.net', lid: '11111@lid', name: 'User 1' },
                { id: '6289876543210@s.whatsapp.net', lid: '22222@lid', name: 'User 2' },
            ]);
            expect(resolveToPhone('11111@lid')).toBe('6281234567890');
            expect(resolveToPhone('22222@lid')).toBe('6289876543210');
        });

        it('should skip contacts without lid', () => {
            registerFromContacts([
                { id: '6281234567890@s.whatsapp.net', name: 'No LID' },
            ]);
            expect(getMappingCount()).toBe(0);
        });

        it('should handle non-array gracefully', () => {
            registerFromContacts(null);
            registerFromContacts('not an array');
            expect(getMappingCount()).toBe(0);
        });
    });

    describe('registerFromMe', () => {
        it('should register bot own LID-phone from creds.me', () => {
            registerFromMe({ id: '6282210819939@s.whatsapp.net', lid: '17685450589393701@lid' });
            expect(resolveToPhone('17685450589393701@lid')).toBe('6282210819939');
        });

        it('should handle null me', () => {
            registerFromMe(null);
            expect(getMappingCount()).toBe(0);
        });

        it('should handle me without lid', () => {
            registerFromMe({ id: '6282210819939@s.whatsapp.net' });
            expect(getMappingCount()).toBe(0);
        });
    });

    // ═══════════════════════════════════════════════════════
    //  UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════

    describe('resolveToPhoneOrLid', () => {
        it('should return phone for resolvable JID', () => {
            expect(resolveToPhoneOrLid('6282210819939@s.whatsapp.net')).toBe('6282210819939');
        });

        it('should return LID user part for unresolvable @lid', () => {
            expect(resolveToPhoneOrLid('99999@lid')).toBe('99999');
        });

        it('should never return null or empty', () => {
            const result = resolveToPhoneOrLid('something');
            expect(result).toBeTruthy();
        });
    });

    describe('canResolve', () => {
        it('should return true for phone JID', () => {
            expect(canResolve('6282210819939@s.whatsapp.net')).toBe(true);
        });

        it('should return false for unregistered LID', () => {
            expect(canResolve('99999@lid')).toBe(false);
        });

        it('should return true for registered LID', () => {
            registerMapping('99999@lid', '6281234567890');
            expect(canResolve('99999@lid')).toBe(true);
        });
    });

    describe('getAllMappings', () => {
        it('should return all registered mappings', () => {
            registerMapping('11111@lid', '6281111111111');
            registerMapping('22222@lid', '6282222222222');
            const mappings = getAllMappings();
            expect(mappings).toHaveLength(2);
            expect(mappings).toEqual(
                expect.arrayContaining([
                    { lid: '11111', phone: '6281111111111' },
                    { lid: '22222', phone: '6282222222222' },
                ])
            );
        });
    });
});
