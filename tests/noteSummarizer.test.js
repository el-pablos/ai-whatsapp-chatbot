const {
    summarizeNotes,
    truncateNotes,
    extractActionItems,
    SUMMARY_LEVELS,
    WA_MAX_LENGTH,
} = require('../src/video/noteSummarizer');

describe('noteSummarizer', () => {
    // ── SUMMARY_LEVELS ─────────────────────────────────────
    test('exports correct summary level configs', () => {
        expect(SUMMARY_LEVELS.brief).toBeDefined();
        expect(SUMMARY_LEVELS.standard).toBeDefined();
        expect(SUMMARY_LEVELS.detailed).toBeDefined();
        expect(SUMMARY_LEVELS.brief.maxLength).toBeLessThan(SUMMARY_LEVELS.standard.maxLength);
    });

    test('exports WA_MAX_LENGTH constant', () => {
        expect(typeof WA_MAX_LENGTH).toBe('number');
        expect(WA_MAX_LENGTH).toBeGreaterThan(0);
    });

    // ── truncateNotes ──────────────────────────────────────
    describe('truncateNotes', () => {
        test('returns text unchanged if under limit', () => {
            expect(truncateNotes('short', 100)).toBe('short');
        });

        test('truncates long text and adds indicator', () => {
            const long = 'a'.repeat(200);
            const result = truncateNotes(long, 100);
            expect(result.length).toBeLessThanOrEqual(120);
            expect(result).toContain('terpotong');
        });

        test('handles null/empty', () => {
            expect(truncateNotes('', 100)).toBe('');
            expect(truncateNotes(null, 100)).toBe('');
        });
    });

    // ── extractActionItems ─────────────────────────────────
    describe('extractActionItems', () => {
        test('extracts Indonesian action items', () => {
            const text = 'Bla bla. Kamu harus install Node.js terlebih dahulu. Jangan lupa restart server setelahnya.';
            const result = extractActionItems(text);
            expect(result.length).toBeGreaterThanOrEqual(1);
        });

        test('returns empty for no actions', () => {
            expect(extractActionItems('just normal text without any action words')).toEqual([]);
        });

        test('handles null', () => {
            expect(extractActionItems(null)).toEqual([]);
        });
    });

    // ── summarizeNotes (async) ─────────────────────────────
    describe('summarizeNotes', () => {
        test('returns short notes as-is', async () => {
            const result = await summarizeNotes('Short notes', 'brief');
            expect(result).toBe('Short notes');
        });

        test('falls back to truncation on API error for long text', async () => {
            const long = 'word '.repeat(2000);
            const result = await summarizeNotes(long, 'brief');
            expect(result.length).toBeLessThanOrEqual(SUMMARY_LEVELS.brief.maxLength + 50);
        });

        test('defaults to standard if invalid level', async () => {
            const result = await summarizeNotes('notes', 'invalid');
            expect(result).toBe('notes');
        });

        test('handles null/empty', async () => {
            const result = await summarizeNotes(null);
            expect(result).toContain('Tidak ada');
        });
    });
});
