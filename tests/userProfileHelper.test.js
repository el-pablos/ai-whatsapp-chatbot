/**
 * Unit Tests - User Profile Helper Module
 * 
 * Test cases untuk validasi:
 * 1. normalizePhone — JID stripping, digit-only extraction
 * 2. isOwnerPhone — owner detection for both owners, format variations
 * 3. isSalsaName — case-insensitive Salsa detection
 * 4. classifyUser — mode mapping (owner_salsa, owner, salsa, normal)
 * 5. Edge cases — null, undefined, empty, malformed input
 */

const {
    OWNER_PHONES,
    normalizePhone,
    isOwnerPhone,
    isSalsaName,
    classifyUser,
} = require('../src/userProfileHelper');

describe('User Profile Helper Module', () => {

    // ═══════════════════════════════════════════════════════════
    // OWNER_PHONES constant
    // ═══════════════════════════════════════════════════════════
    describe('OWNER_PHONES', () => {
        it('should contain both owner numbers', () => {
            expect(OWNER_PHONES).toContain('6282210819939');
            expect(OWNER_PHONES).toContain('6285817378442');
        });

        it('should have exactly 2 owner numbers', () => {
            expect(OWNER_PHONES).toHaveLength(2);
        });

        it('should only contain digit strings with 62 prefix', () => {
            OWNER_PHONES.forEach(phone => {
                expect(phone).toMatch(/^62\d+$/);
            });
        });
    });

    // ═══════════════════════════════════════════════════════════
    // normalizePhone
    // ═══════════════════════════════════════════════════════════
    describe('normalizePhone', () => {
        it('should strip @s.whatsapp.net suffix', () => {
            expect(normalizePhone('6282210819939@s.whatsapp.net')).toBe('6282210819939');
        });

        it('should strip @g.us suffix (group JID)', () => {
            expect(normalizePhone('120363400623404965@g.us')).toBe('120363400623404965');
        });

        it('should strip @lid suffix', () => {
            expect(normalizePhone('12345@lid')).toBe('12345');
        });

        it('should keep only digits from raw phone', () => {
            expect(normalizePhone('+62-822-1081-9939')).toBe('6282210819939');
        });

        it('should handle plain digit string unchanged', () => {
            expect(normalizePhone('6282210819939')).toBe('6282210819939');
        });

        it('should return empty string for null/undefined/empty', () => {
            expect(normalizePhone(null)).toBe('');
            expect(normalizePhone(undefined)).toBe('');
            expect(normalizePhone('')).toBe('');
        });
    });

    // ═══════════════════════════════════════════════════════════
    // isOwnerPhone
    // ═══════════════════════════════════════════════════════════
    describe('isOwnerPhone', () => {

        describe('owner #1 (6282210819939)', () => {
            it('should match full JID', () => {
                expect(isOwnerPhone('6282210819939@s.whatsapp.net')).toBe(true);
            });

            it('should match with 62 prefix', () => {
                expect(isOwnerPhone('6282210819939')).toBe(true);
            });

            it('should match with 0 prefix', () => {
                expect(isOwnerPhone('082210819939')).toBe(true);
            });

            it('should match raw without country code', () => {
                expect(isOwnerPhone('82210819939')).toBe(true);
            });
        });

        describe('owner #2 (6285817378442)', () => {
            it('should match full JID', () => {
                expect(isOwnerPhone('6285817378442@s.whatsapp.net')).toBe(true);
            });

            it('should match with 62 prefix', () => {
                expect(isOwnerPhone('6285817378442')).toBe(true);
            });

            it('should match with 0 prefix', () => {
                expect(isOwnerPhone('085817378442')).toBe(true);
            });

            it('should match raw without country code', () => {
                expect(isOwnerPhone('85817378442')).toBe(true);
            });
        });

        describe('non-owners', () => {
            it('should return false for random number', () => {
                expect(isOwnerPhone('6281234567890@s.whatsapp.net')).toBe(false);
            });

            it('should return false for group JID', () => {
                expect(isOwnerPhone('120363400623404965@g.us')).toBe(false);
            });

            it('should return false for partial owner number', () => {
                expect(isOwnerPhone('822108')).toBe(false);
            });

            it('should return false for null/undefined/empty', () => {
                expect(isOwnerPhone(null)).toBe(false);
                expect(isOwnerPhone(undefined)).toBe(false);
                expect(isOwnerPhone('')).toBe(false);
            });
        });
    });

    // ═══════════════════════════════════════════════════════════
    // isSalsaName
    // ═══════════════════════════════════════════════════════════
    describe('isSalsaName', () => {

        it('should match exact "Salsa"', () => {
            expect(isSalsaName('Salsa')).toBe(true);
        });

        it('should be case-insensitive', () => {
            expect(isSalsaName('salsa')).toBe(true);
            expect(isSalsaName('SALSA')).toBe(true);
            expect(isSalsaName('sAlSa')).toBe(true);
        });

        it('should match name containing "salsa"', () => {
            expect(isSalsaName('Salsa Bila')).toBe(true);
            expect(isSalsaName('Princess Salsa')).toBe(true);
            expect(isSalsaName('salsabella')).toBe(true);
        });

        it('should return false for names without "salsa"', () => {
            expect(isSalsaName('Tama')).toBe(false);
            expect(isSalsaName('John')).toBe(false);
            expect(isSalsaName('RandomUser')).toBe(false);
        });

        it('should return false for null/undefined/empty', () => {
            expect(isSalsaName(null)).toBe(false);
            expect(isSalsaName(undefined)).toBe(false);
            expect(isSalsaName('')).toBe(false);
        });

        it('should return false for non-string values', () => {
            expect(isSalsaName(123)).toBe(false);
            expect(isSalsaName({})).toBe(false);
            expect(isSalsaName([])).toBe(false);
        });
    });

    // ═══════════════════════════════════════════════════════════
    // classifyUser
    // ═══════════════════════════════════════════════════════════
    describe('classifyUser', () => {

        describe('mode: owner_salsa', () => {
            it('should classify owner with Salsa name as owner_salsa', () => {
                const result = classifyUser('6282210819939@s.whatsapp.net', 'Salsa');
                expect(result.isOwner).toBe(true);
                expect(result.isSalsa).toBe(true);
                expect(result.mode).toBe('owner_salsa');
            });

            it('should include both OWNER and SPECIAL_USER tags in contextHint', () => {
                const result = classifyUser('6282210819939', 'Salsa Bella');
                expect(result.contextHint).toContain('[OWNER: true]');
                expect(result.contextHint).toContain('[SPECIAL_USER: Salsa]');
            });

            it('should work for second owner with Salsa name', () => {
                const result = classifyUser('6285817378442', 'Salsa');
                expect(result.mode).toBe('owner_salsa');
                expect(result.isOwner).toBe(true);
                expect(result.isSalsa).toBe(true);
            });
        });

        describe('mode: owner', () => {
            it('should classify owner #1 (Tama) as owner', () => {
                const result = classifyUser('6282210819939@s.whatsapp.net', 'Tama');
                expect(result.isOwner).toBe(true);
                expect(result.isSalsa).toBe(false);
                expect(result.mode).toBe('owner');
            });

            it('should classify owner #2 as owner', () => {
                const result = classifyUser('6285817378442@s.whatsapp.net', 'Someone');
                expect(result.isOwner).toBe(true);
                expect(result.isSalsa).toBe(false);
                expect(result.mode).toBe('owner');
            });

            it('should include OWNER tag in contextHint', () => {
                const result = classifyUser('6282210819939', 'Tama');
                expect(result.contextHint).toContain('[OWNER: true]');
                expect(result.contextHint).not.toContain('[SPECIAL_USER');
            });

            it('should work with 0-prefix phone', () => {
                const result = classifyUser('082210819939', 'Boss');
                expect(result.mode).toBe('owner');
            });
        });

        describe('mode: salsa', () => {
            it('should classify non-owner Salsa as salsa mode', () => {
                const result = classifyUser('6281111111111@s.whatsapp.net', 'Salsa');
                expect(result.isOwner).toBe(false);
                expect(result.isSalsa).toBe(true);
                expect(result.mode).toBe('salsa');
            });

            it('should include SPECIAL_USER tag but not OWNER in contextHint', () => {
                const result = classifyUser('6281111111111', 'Queen Salsa');
                expect(result.contextHint).toContain('[SPECIAL_USER: Salsa]');
                expect(result.contextHint).not.toContain('[OWNER');
            });
        });

        describe('mode: normal', () => {
            it('should classify regular user as normal', () => {
                const result = classifyUser('6281234567890@s.whatsapp.net', 'RandomUser');
                expect(result.isOwner).toBe(false);
                expect(result.isSalsa).toBe(false);
                expect(result.mode).toBe('normal');
            });

            it('should return empty contextHint for normal users', () => {
                const result = classifyUser('6281234567890', 'Someone');
                expect(result.contextHint).toBe('');
            });
        });

        describe('edge cases', () => {
            it('should handle null pushName gracefully', () => {
                const result = classifyUser('6282210819939', null);
                expect(result.isOwner).toBe(true);
                expect(result.isSalsa).toBe(false);
                expect(result.mode).toBe('owner');
            });

            it('should handle null jid gracefully', () => {
                const result = classifyUser(null, 'Salsa');
                expect(result.isOwner).toBe(false);
                expect(result.isSalsa).toBe(true);
                expect(result.mode).toBe('salsa');
            });

            it('should handle both null as normal', () => {
                const result = classifyUser(null, null);
                expect(result.isOwner).toBe(false);
                expect(result.isSalsa).toBe(false);
                expect(result.mode).toBe('normal');
            });

            it('should return consistent shape for all modes', () => {
                const modes = [
                    classifyUser('6282210819939', 'Salsa'),   // owner_salsa
                    classifyUser('6282210819939', 'Tama'),     // owner
                    classifyUser('628111111', 'Salsa'),         // salsa
                    classifyUser('628111111', 'John'),          // normal
                ];
                modes.forEach(result => {
                    expect(result).toHaveProperty('isOwner');
                    expect(result).toHaveProperty('isSalsa');
                    expect(result).toHaveProperty('mode');
                    expect(result).toHaveProperty('contextHint');
                    expect(typeof result.isOwner).toBe('boolean');
                    expect(typeof result.isSalsa).toBe('boolean');
                    expect(typeof result.mode).toBe('string');
                    expect(typeof result.contextHint).toBe('string');
                });
            });
        });
    });

});
