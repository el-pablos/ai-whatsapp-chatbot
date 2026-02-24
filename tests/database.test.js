/**
 * Unit Tests - Database Module
 * 
 * Test cases untuk validasi:
 * 1. User preferences functions
 * 2. Owner detection (both owners)
 * 3. Nickname pattern detection (without database side effects)
 * 4. Retention policy constants & cleanup
 * 5. Backward compatibility (legacy data preserved)
 */

// Import functions that don't need database mocking
const {
    isOwner,
    getBotResponseAfter,
    OWNER_NUMBERS,
    RETENTION_MS,
    RETENTION_MONTHS,
    SESSION_EXPIRY_MS
} = require('../src/database');

describe('Database Module - User Preferences', () => {

    // ═══════════════════════════════════════════════════════════
    // Owner Detection Tests (no database needed)
    // ═══════════════════════════════════════════════════════════
    describe('isOwner', () => {

        it('should return true for owner phone number with country code', () => {
            expect(isOwner('6282210819939@s.whatsapp.net')).toBe(true);
        });

        it('should return true for owner phone number without prefix', () => {
            expect(isOwner('082210819939@s.whatsapp.net')).toBe(true);
        });

        it('should return false for non-owner JID', () => {
            expect(isOwner('6281234567890@s.whatsapp.net')).toBe(false);
        });

        it('should return false for group JID', () => {
            expect(isOwner('120363400623404965@g.us')).toBe(false);
        });

        it('should return false for null/undefined', () => {
            expect(isOwner(null)).toBe(false);
            expect(isOwner(undefined)).toBe(false);
            expect(isOwner('')).toBe(false);
        });

        it('should match owner with different format variations', () => {
            // All these should match
            expect(isOwner('6282210819939')).toBe(true);
            expect(isOwner('082210819939')).toBe(true);
            expect(isOwner('82210819939')).toBe(true);
        });

    });

    describe('OWNER_NUMBERS', () => {

        it('should be an array with owner numbers', () => {
            expect(Array.isArray(OWNER_NUMBERS)).toBe(true);
            expect(OWNER_NUMBERS.length).toBeGreaterThan(0);
        });

        it('should contain the main owner number', () => {
            expect(OWNER_NUMBERS.some(num => num.includes('82210819939'))).toBe(true);
        });

        it('should contain the second owner number', () => {
            expect(OWNER_NUMBERS.some(num => num.includes('85817378442'))).toBe(true);
        });

    });

    // ═══════════════════════════════════════════════════════════
    // Owner Detection — second owner (6285817378442)
    // ═══════════════════════════════════════════════════════════
    describe('isOwner - second owner (6285817378442)', () => {

        it('should return true for second owner with country code JID', () => {
            expect(isOwner('6285817378442@s.whatsapp.net')).toBe(true);
        });

        it('should return true for second owner with 0 prefix', () => {
            expect(isOwner('085817378442@s.whatsapp.net')).toBe(true);
        });

        it('should return true for second owner raw digits', () => {
            expect(isOwner('6285817378442')).toBe(true);
            expect(isOwner('085817378442')).toBe(true);
            expect(isOwner('85817378442')).toBe(true);
        });

    });

    // ═══════════════════════════════════════════════════════════
    // Nickname Pattern Detection Tests (pattern matching logic only)
    // ═══════════════════════════════════════════════════════════
    describe('nickname pattern detection', () => {
        
        // Test the regex patterns directly without database
        // IMPORTANT: More specific patterns MUST come first (same order as database.js)
        const patterns = [
            // "jangan panggil gw bro, panggil X" - must be first because it contains "panggil gw"
            /jangan\s+(?:panggil|sebut)\s+(?:gw|gue|w|aku)\s+bro,?\s*(?:panggil|sebut)?\s*(.+)/i,
            // "gw mau dipanggil X"
            /(?:gw|gue|w|aku)\s+(?:mau dipanggil|pengen dipanggil)\s+(.+)/i,
            // "nama gw X"
            /(?:nama|name)\s+(?:gw|gue|w|aku|saya)\s+(.+)/i,
            // "panggil gw X" - more general pattern last
            /(?:panggil|sebut|call)\s+(?:gw|gue|w|aku|saya|me)\s+(.+)/i,
        ];
        
        const testPattern = (message) => {
            for (const pattern of patterns) {
                const match = message.match(pattern);
                if (match && match[1]) {
                    return match[1].trim().replace(/[.,!?]+$/, '').trim();
                }
            }
            return null;
        };

        it('should detect "panggil gw X" pattern', () => {
            const result = testPattern('panggil gw king tama');
            expect(result).toBe('king tama');
        });

        it('should detect "nama gw X" pattern', () => {
            const result = testPattern('nama gw Pablo');
            expect(result).toBe('Pablo');
        });

        it('should detect "jangan panggil bro, panggil X" pattern', () => {
            // More specific pattern now matched first
            const result = testPattern('jangan panggil gw bro panggil king');
            expect(result).toBe('king');
        });

        it('should detect "gw mau dipanggil X" pattern', () => {
            const result = testPattern('gw mau dipanggil boss');
            expect(result).toBe('boss');
        });

        it('should return null for non-nickname messages', () => {
            expect(testPattern('halo apa kabar')).toBeNull();
            expect(testPattern('gimana caranya coding')).toBeNull();
        });

        it('should trim and clean nickname with punctuation', () => {
            const result = testPattern('panggil gw boss!');
            expect(result).toBe('boss');
        });

        it('should handle mixed case', () => {
            const result = testPattern('Panggil GW King');
            expect(result).toBe('King');
        });

    });

    // ═══════════════════════════════════════════════════════════
    // getBotResponseAfter - export validation
    // ═══════════════════════════════════════════════════════════
    describe('getBotResponseAfter', () => {
        it('should be exported as a function', () => {
            expect(typeof getBotResponseAfter).toBe('function');
        });

        it('should return null for null/undefined input', () => {
            expect(getBotResponseAfter(null, null)).toBeNull();
            expect(getBotResponseAfter(undefined, undefined)).toBeNull();
            expect(getBotResponseAfter('', '')).toBeNull();
        });
    });

    // ═══════════════════════════════════════════════════════════
    // Retention Policy Constants
    // ═══════════════════════════════════════════════════════════
    describe('Retention Policy', () => {

        it('should export RETENTION_MONTHS as a positive number', () => {
            expect(typeof RETENTION_MONTHS).toBe('number');
            expect(RETENTION_MONTHS).toBeGreaterThan(0);
        });

        it('should default to 6 months retention', () => {
            // Default unless overridden by env
            expect(RETENTION_MONTHS).toBe(6);
        });

        it('should export RETENTION_MS consistent with RETENTION_MONTHS', () => {
            const expectedMs = RETENTION_MONTHS * 30 * 24 * 60 * 60 * 1000;
            expect(RETENTION_MS).toBe(expectedMs);
        });

        it('should have RETENTION_MS much larger than SESSION_EXPIRY_MS', () => {
            // Retention (6 months) >>> session context window (24h)
            expect(RETENTION_MS).toBeGreaterThan(SESSION_EXPIRY_MS * 100);
        });

        it('should export SESSION_EXPIRY_MS as a positive number', () => {
            expect(typeof SESSION_EXPIRY_MS).toBe('number');
            expect(SESSION_EXPIRY_MS).toBeGreaterThan(0);
        });

        it('should have SESSION_EXPIRY_MS default to 24 hours', () => {
            // 24h = 86400000ms
            expect(SESSION_EXPIRY_MS).toBe(24 * 60 * 60 * 1000);
        });

        it('should have retention period of approximately 6 months in days', () => {
            const retentionDays = RETENTION_MS / (24 * 60 * 60 * 1000);
            expect(retentionDays).toBe(180); // 6 * 30
        });

    });

});
