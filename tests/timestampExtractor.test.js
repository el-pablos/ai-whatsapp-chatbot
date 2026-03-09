const {
    parseTimestamp,
    formatTimestamp,
    extractTimestamps,
    findTimestamps,
    generateChaptersSummary,
} = require('../src/video/timestampExtractor');

describe('timestampExtractor', () => {
    // ── parseTimestamp ─────────────────────────────────────
    describe('parseTimestamp', () => {
        test('parses MM:SS format', () => {
            expect(parseTimestamp('1:23')).toBe(83);
            expect(parseTimestamp('10:05')).toBe(605);
        });

        test('parses HH:MM:SS format', () => {
            expect(parseTimestamp('1:23:45')).toBe(5025);
            expect(parseTimestamp('01:00:00')).toBe(3600);
        });

        test('returns 0 for invalid input', () => {
            expect(parseTimestamp('')).toBe(0);
            expect(parseTimestamp(null)).toBe(0);
            expect(parseTimestamp(undefined)).toBe(0);
            expect(parseTimestamp('abc')).toBe(0);
        });
    });

    // ── formatTimestamp ────────────────────────────────────
    describe('formatTimestamp', () => {
        test('formats seconds < 1 hour', () => {
            expect(formatTimestamp(83)).toBe('1:23');
            expect(formatTimestamp(0)).toBe('0:00');
        });

        test('formats seconds >= 1 hour', () => {
            expect(formatTimestamp(3661)).toBe('1:01:01');
        });

        test('handles negative / falsy', () => {
            expect(formatTimestamp(-5)).toBe('0:00');
            expect(formatTimestamp(null)).toBe('0:00');
        });
    });

    // ── extractTimestamps ──────────────────────────────────
    describe('extractTimestamps', () => {
        test('extracts timestamps from description text', () => {
            const text = '0:00 Intro\n1:23 Topik pertama\n5:00 Penutup';
            const result = extractTimestamps(text);
            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({ time: '0:00', seconds: 0, label: 'Intro' });
            expect(result[1].label).toBe('Topik pertama');
        });

        test('handles dashes in timestamp separator', () => {
            const text = '0:00 — Opening\n2:30 - Main topic';
            const result = extractTimestamps(text);
            expect(result.length).toBeGreaterThanOrEqual(2);
        });

        test('deduplicates same timestamp+label', () => {
            const text = '0:00 Intro\n0:00 Intro';
            const result = extractTimestamps(text);
            expect(result).toHaveLength(1);
        });

        test('returns sorted by seconds', () => {
            const text = '5:00 End\n0:00 Start\n2:30 Middle';
            const result = extractTimestamps(text);
            expect(result[0].seconds).toBeLessThanOrEqual(result[1].seconds);
        });

        test('returns empty for null/empty', () => {
            expect(extractTimestamps(null)).toEqual([]);
            expect(extractTimestamps('')).toEqual([]);
        });
    });

    // ── findTimestamps ─────────────────────────────────────
    describe('findTimestamps', () => {
        test('finds timestamp strings in text', () => {
            const text = 'Check 1:23 and also 10:30 for more info';
            const result = findTimestamps(text);
            expect(result).toContain('1:23');
            expect(result).toContain('10:30');
        });

        test('returns unique values', () => {
            const text = 'See 1:23 and 1:23 again';
            expect(findTimestamps(text)).toHaveLength(1);
        });

        test('returns empty for null', () => {
            expect(findTimestamps(null)).toEqual([]);
        });
    });

    // ── generateChaptersSummary ────────────────────────────
    describe('generateChaptersSummary', () => {
        test('generates formatted chapters text', () => {
            const timestamps = [
                { time: '0:00', seconds: 0, label: 'Intro' },
                { time: '2:30', seconds: 150, label: 'Main' },
            ];
            const result = generateChaptersSummary(timestamps, 300);
            expect(result).toContain('Video Chapters');
            expect(result).toContain('0:00');
            expect(result).toContain('Intro');
            expect(result).toContain('2 chapters');
        });

        test('returns fallback for empty timestamps', () => {
            expect(generateChaptersSummary([])).toContain('Tidak ada');
            expect(generateChaptersSummary(null)).toContain('Tidak ada');
        });
    });
});
