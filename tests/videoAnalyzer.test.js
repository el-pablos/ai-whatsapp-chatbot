jest.mock('child_process', () => {
    const { promisify } = require('util');
    const execFileMock = jest.fn();
    const asyncMock = jest.fn();
    execFileMock[promisify.custom] = asyncMock;
    return { execFile: execFileMock };
});
jest.mock('fs', () => {
    const actual = jest.requireActual('fs');
    return {
        ...actual,
        promises: {
            ...actual.promises,
            mkdir: jest.fn().mockResolvedValue(undefined),
            readFile: jest.fn().mockResolvedValue(''),
            unlink: jest.fn().mockResolvedValue(undefined),
        },
    };
});

const { promisify } = require('util');
const { execFile } = require('child_process');
const execFileAsync = execFile[promisify.custom];
const fs = require('fs').promises;
const { analyzeVideo, getVideoMetadata, fetchTranscript } = require('../src/video/videoAnalyzer');

// Helper: make execFileAsync return {stdout, stderr}
const mockExecSuccess = (stdout) => {
    execFileAsync.mockResolvedValue({ stdout, stderr: '' });
};

const mockExecError = (msg) => {
    execFileAsync.mockRejectedValue(new Error(msg));
};

describe('videoAnalyzer', () => {
    beforeEach(() => jest.clearAllMocks());

    // ── analyzeVideo ───────────────────────────────────────
    describe('analyzeVideo', () => {
        test('returns error for non-YouTube URL', async () => {
            const result = await analyzeVideo('https://example.com/video');
            expect(result.success).toBe(false);
            expect(result.error).toContain('bukan YouTube');
        });

        test('returns error when metadata fails', async () => {
            mockExecError('yt-dlp not found');

            const result = await analyzeVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            expect(result.success).toBe(false);
        });
    });

    // ── getVideoMetadata ───────────────────────────────────
    describe('getVideoMetadata', () => {
        test('parses yt-dlp JSON output', async () => {
            const videoJson = JSON.stringify({
                title: 'Test Video',
                description: 'Test desc',
                duration: 300,
                uploader: 'TestUser',
                thumbnail: 'https://img.youtube.com/vi/abc/0.jpg',
                view_count: 1000,
                upload_date: '20240101',
            });
            mockExecSuccess(videoJson);

            const result = await getVideoMetadata('abc123');
            expect(result.success).toBe(true);
            expect(result.title).toBe('Test Video');
            expect(result.duration).toBe(300);
            expect(result.channel).toBe('TestUser');
        });

        test('returns error on yt-dlp failure', async () => {
            mockExecError('not found');

            const result = await getVideoMetadata('bad');
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    // ── fetchTranscript ────────────────────────────────────
    describe('fetchTranscript', () => {
        test('returns null when no subtitle files', async () => {
            mockExecSuccess('');
            fs.readFile.mockRejectedValue(new Error('ENOENT'));

            const result = await fetchTranscript('abc123');
            expect(result).toBeNull();
        });

        test('returns parsed transcript when VTT file exists', async () => {
            mockExecSuccess('');

            const vttContent = `WEBVTT

1
00:00:01,000 --> 00:00:05,000
Hello world

2
00:00:06,000 --> 00:00:10,000
Test transcript`;

            fs.readFile.mockResolvedValueOnce(vttContent);

            const result = await fetchTranscript('abc123');
            expect(result).toContain('Hello world');
        });
    });
});
