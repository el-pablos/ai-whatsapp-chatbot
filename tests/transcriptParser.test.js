const {
    cleanTranscript,
    parseSRT,
    parseVTT,
    mergeSegments,
    formatTranscript,
    getPlainText,
    splitBySections,
} = require('../src/video/transcriptParser');

describe('transcriptParser', () => {
    // ── cleanTranscript ────────────────────────────────────
    describe('cleanTranscript', () => {
        test('normalizes whitespace and newlines', () => {
            const raw = 'hello  world\r\n\r\n\r\nbye';
            const result = cleanTranscript(raw);
            expect(result).toBe('hello world\n\nbye');
        });

        test('removes [Music] style tags', () => {
            expect(cleanTranscript('hello [Music] world')).toBe('hello world');
        });

        test('returns empty for null/invalid', () => {
            expect(cleanTranscript(null)).toBe('');
            expect(cleanTranscript('')).toBe('');
        });
    });

    // ── parseSRT ───────────────────────────────────────────
    describe('parseSRT', () => {
        const srt = `1
00:00:01,000 --> 00:00:05,000
Hello world

2
00:00:06,000 --> 00:00:10,000
Second line`;

        test('parses SRT blocks into segments', () => {
            const result = parseSRT(srt);
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({ start: 1, end: 5, text: 'Hello world' });
            expect(result[1]).toEqual({ start: 6, end: 10, text: 'Second line' });
        });

        test('returns empty for null', () => {
            expect(parseSRT(null)).toEqual([]);
        });
    });

    // ── parseVTT ───────────────────────────────────────────
    describe('parseVTT', () => {
        const vtt = `WEBVTT
Kind: captions
Language: en

1
00:00:01,000 --> 00:00:05,000
Hello VTT`;

        test('parses VTT format', () => {
            const result = parseVTT(vtt);
            expect(result).toHaveLength(1);
            expect(result[0].text).toBe('Hello VTT');
        });

        test('returns empty for null', () => {
            expect(parseVTT(null)).toEqual([]);
        });
    });

    // ── mergeSegments ──────────────────────────────────────
    describe('mergeSegments', () => {
        test('merges adjacent segments within gap threshold', () => {
            const segments = [
                { start: 0, end: 5, text: 'hello' },
                { start: 6, end: 10, text: 'world' }, // gap = 1s
            ];
            const result = mergeSegments(segments, 2);
            expect(result).toHaveLength(1);
            expect(result[0].text).toBe('hello world');
        });

        test('keeps segments separate when gap exceeds threshold', () => {
            const segments = [
                { start: 0, end: 5, text: 'hello' },
                { start: 20, end: 25, text: 'world' },
            ];
            const result = mergeSegments(segments, 2);
            expect(result).toHaveLength(2);
        });

        test('returns empty for empty input', () => {
            expect(mergeSegments([])).toEqual([]);
            expect(mergeSegments(null)).toEqual([]);
        });
    });

    // ── formatTranscript ───────────────────────────────────
    describe('formatTranscript', () => {
        const segments = [
            { start: 0, end: 5, text: 'Hello' },
            { start: 60, end: 65, text: 'World' },
        ];

        test('formats with timestamps by default', () => {
            const result = formatTranscript(segments);
            expect(result).toContain('[0:00]');
            expect(result).toContain('[1:00]');
        });

        test('hides timestamps when option set', () => {
            const result = formatTranscript(segments, { showTimestamps: false });
            expect(result).not.toContain('[');
        });

        test('truncates when exceeding maxLength', () => {
            const result = formatTranscript(segments, { maxLength: 10 });
            expect(result).toContain('terpotong');
        });

        test('returns fallback for empty', () => {
            expect(formatTranscript([])).toContain('tidak tersedia');
        });
    });

    // ── getPlainText ───────────────────────────────────────
    describe('getPlainText', () => {
        test('joins segment text with spaces', () => {
            const segments = [
                { start: 0, end: 5, text: 'hello' },
                { start: 5, end: 10, text: 'world' },
            ];
            expect(getPlainText(segments)).toBe('hello world');
        });

        test('returns empty for null/empty', () => {
            expect(getPlainText(null)).toBe('');
            expect(getPlainText([])).toBe('');
        });
    });

    // ── splitBySections ────────────────────────────────────
    describe('splitBySections', () => {
        test('splits segments into time-based sections', () => {
            const segments = [
                { start: 0, end: 100, text: 'section1' },
                { start: 200, end: 250, text: 'still1' },
                { start: 350, end: 400, text: 'section2' },
            ];
            const result = splitBySections(segments, 300);
            expect(result).toHaveLength(2);
            expect(result[0].text).toContain('section1');
            expect(result[1].text).toContain('section2');
        });

        test('returns empty for empty input', () => {
            expect(splitBySections([])).toEqual([]);
            expect(splitBySections(null)).toEqual([]);
        });
    });
});
