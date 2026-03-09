jest.mock('axios');
jest.mock('../src/aiHandler', () => ({
    COPILOT_API_URL: 'http://localhost:4141',
    COPILOT_API_MODEL: 'test-model',
}));

const axios = require('axios');
const { formatFullNotes, extractKeyPoints, generateAISummary, generateVideoNotes } = require('../src/video/videoNoteGenerator');

describe('videoNoteGenerator', () => {
    beforeEach(() => jest.clearAllMocks());

    // ── formatFullNotes ────────────────────────────────────
    describe('formatFullNotes', () => {
        test('formats basic video note', () => {
            const result = formatFullNotes({
                title: 'Test Video',
                channel: 'TestChannel',
                url: 'https://youtube.com/watch?v=abc',
                duration: 600,
                summary: 'Ini ringkasan.',
                chapters: '',
                keyPoints: ['Point A', 'Point B'],
                timestamps: [],
            });
            expect(result).toContain('Test Video');
            expect(result).toContain('TestChannel');
            expect(result).toContain('Ringkasan');
            expect(result).toContain('Point A');
        });

        test('includes chapters when timestamps exist', () => {
            const result = formatFullNotes({
                title: 'T', channel: '', url: '', duration: 0,
                summary: '', chapters: '0:00 Intro',
                keyPoints: [],
                timestamps: [{ time: '0:00', seconds: 0, label: 'Intro' }],
            });
            expect(result).toContain('0:00 Intro');
        });

        test('handles missing fields gracefully', () => {
            const result = formatFullNotes({});
            expect(result).toContain('Video Notes');
            expect(result).toContain('Unknown');
        });
    });

    // ── generateAISummary ──────────────────────────────────
    describe('generateAISummary', () => {
        test('returns AI-generated summary', async () => {
            axios.post.mockResolvedValue({
                data: { choices: [{ message: { content: 'Ringkasan singkat.' } }] },
            });

            const result = await generateAISummary('Title', 'transcript text', 'desc', 300);
            expect(result).toBe('Ringkasan singkat.');
            expect(axios.post).toHaveBeenCalledTimes(1);
        });

        test('returns fallback when no data', async () => {
            const result = await generateAISummary('Title', '', '', 0);
            expect(result).toContain('Tidak cukup data');
        });

        test('handles API error', async () => {
            axios.post.mockRejectedValue(new Error('timeout'));
            const result = await generateAISummary('Title', 'some transcript', '', 300);
            expect(result).toContain('Gagal');
        });
    });

    // ── extractKeyPoints ───────────────────────────────────
    describe('extractKeyPoints', () => {
        test('parses key points from AI response', async () => {
            axios.post.mockResolvedValue({
                data: { choices: [{ message: { content: '- Point one\n- Point two\n- Point three' } }] },
            });

            const result = await extractKeyPoints('Title', 'long transcript text about many topics and stuff repeated here to be long enough for the check');
            expect(result).toContain('Point one');
            expect(result.length).toBeGreaterThanOrEqual(3);
        });

        test('returns empty for short transcript', async () => {
            const result = await extractKeyPoints('Title', 'short');
            expect(result).toEqual([]);
        });

        test('handles API error', async () => {
            axios.post.mockRejectedValue(new Error('fail'));
            const result = await extractKeyPoints('Title', 'long transcript text about many topics');
            expect(result).toEqual([]);
        });
    });

    // ── generateVideoNotes ─────────────────────────────────
    describe('generateVideoNotes', () => {
        test('generates full video notes', async () => {
            axios.post.mockResolvedValue({
                data: { choices: [{ message: { content: 'AI generated content here' } }] },
            });

            const result = await generateVideoNotes({
                title: 'Test Video',
                description: '0:00 Intro\n1:30 Main',
                transcript: 'Some transcript content that is long enough',
                duration: 300,
                channel: 'TestCh',
                url: 'https://youtube.com/watch?v=abc',
            });

            expect(result.summary).toBeDefined();
            expect(result.chapters).toBeDefined();
            expect(result.keyPoints).toBeDefined();
            expect(result.fullNotes).toContain('Test Video');
        });

        test('handles empty input', async () => {
            const result = await generateVideoNotes({});
            expect(result.fullNotes).toContain('Video Notes');
        });
    });
});
