jest.mock('axios');
jest.mock('../src/aiHandler', () => ({
    COPILOT_API_URL: 'http://localhost:4141',
    COPILOT_API_MODEL: 'test-model',
}));

const { processVideoNotes } = require('../src/youtubeHandler');
const { saveVideoNote, getVideoNote, getVideoNotes } = require('../src/database');
const { formatForWhatsApp } = require('../src/video/noteFormatter');
const { summarizeNotes } = require('../src/video/noteSummarizer');
const { getCachedNotes, setCachedNotes, _notesCache } = require('../src/video/videoAnalyzer');

describe('Video Notes Integration', () => {
    beforeEach(() => _notesCache.clear());

    // ── processVideoNotes export ───────────────────────────
    test('processVideoNotes is exported from youtubeHandler', () => {
        expect(typeof processVideoNotes).toBe('function');
    });

    // ── database CRUD ──────────────────────────────────────
    describe('database CRUD', () => {
        const chatId = 'test_vnotes@c.us';
        const videoId = 'test_vid_123';

        test('saveVideoNote and getVideoNote work', () => {
            saveVideoNote(chatId, videoId, 'https://youtube.com/watch?v=test', 'Test Video',
                'full notes here', 'summary', ['point1', 'point2'], [{ time: '0:00', label: 'Intro' }], 300);
            
            const note = getVideoNote(chatId, videoId);
            expect(note).not.toBeNull();
            expect(note.title).toBe('Test Video');
            expect(note.key_points).toEqual(['point1', 'point2']);
            expect(note.chapters).toEqual([{ time: '0:00', label: 'Intro' }]);
        });

        test('getVideoNotes returns list', () => {
            saveVideoNote(chatId, 'vid_a', 'url_a', 'Video A', 'notes', 'sum', [], [], 100);
            saveVideoNote(chatId, 'vid_b', 'url_b', 'Video B', 'notes', 'sum', [], [], 200);
            
            const notes = getVideoNotes(chatId, 10);
            expect(notes.length).toBeGreaterThanOrEqual(2);
        });
    });

    // ── cache layer ────────────────────────────────────────
    describe('cache layer', () => {
        test('setCachedNotes and getCachedNotes work', () => {
            setCachedNotes('abc_full', { success: true, notes: 'cached notes' });
            const cached = getCachedNotes('abc_full');
            expect(cached).toEqual({ success: true, notes: 'cached notes' });
        });

        test('getCachedNotes returns null for non-existent key', () => {
            expect(getCachedNotes('nonexistent')).toBeNull();
        });
    });

    // ── noteFormatter ──────────────────────────────────────
    test('formatForWhatsApp produces valid output', () => {
        const result = formatForWhatsApp({
            title: 'Integration Test',
            summary: 'Test summary',
            keyPoints: ['KP1'],
            chapters: [],
        });
        expect(result).toContain('Integration Test');
    });

    // ── noteSummarizer ─────────────────────────────────────
    test('summarizeNotes returns string for short text', async () => {
        const result = await summarizeNotes('Short text');
        expect(typeof result).toBe('string');
    });
});
