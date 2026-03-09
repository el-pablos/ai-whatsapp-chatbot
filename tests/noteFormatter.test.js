const {
    formatForWhatsApp,
    formatAsMarkdown,
    formatAsPlainText,
} = require('../src/video/noteFormatter');

const sampleNotes = {
    title: 'Test Video Title',
    channel: 'TestChannel',
    url: 'https://youtube.com/watch?v=abc123',
    duration: 600,
    summary: 'Ini ringkasan video tentang testing.',
    keyPoints: ['Point satu', 'Point dua', 'Point tiga'],
    chapters: [
        { time: '0:00', label: 'Intro' },
        { time: '5:00', label: 'Main content' },
    ],
};

describe('noteFormatter', () => {
    // ── formatForWhatsApp ──────────────────────────────────
    describe('formatForWhatsApp', () => {
        test('formats notes for WhatsApp with bold markers', () => {
            const result = formatForWhatsApp(sampleNotes);
            expect(result).toContain('*Test Video Title*');
            expect(result).toContain('Ringkasan');
            expect(result).toContain('Point satu');
        });

        test('handles missing fields', () => {
            const result = formatForWhatsApp({ title: 'Only Title' });
            expect(result).toContain('Only Title');
        });

        test('handles empty input', () => {
            const result = formatForWhatsApp({});
            expect(typeof result).toBe('string');
        });
    });

    // ── formatAsMarkdown ───────────────────────────────────
    describe('formatAsMarkdown', () => {
        test('formats notes as markdown', () => {
            const result = formatAsMarkdown(sampleNotes);
            expect(result).toContain('# Test Video Title');
            expect(result).toContain('##');
            expect(result).toContain('Point satu');
        });

        test('handles empty input', () => {
            const result = formatAsMarkdown({});
            expect(typeof result).toBe('string');
        });
    });

    // ── formatAsPlainText ──────────────────────────────────
    describe('formatAsPlainText', () => {
        test('formats notes as plain text without formatting', () => {
            const result = formatAsPlainText(sampleNotes);
            expect(result).toContain('Test Video Title');
            expect(result).not.toContain('*');
            expect(result).not.toContain('#');
        });

        test('handles empty input', () => {
            const result = formatAsPlainText({});
            expect(typeof result).toBe('string');
        });
    });
});
