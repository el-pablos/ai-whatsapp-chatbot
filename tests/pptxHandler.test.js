/**
 * Tests for PPTX Handler
 *
 * Tests schema validation, detectPptxRequest, and createPptxFromSpec flow.
 * Python/file operations are mocked — no real Python or filesystem needed.
 */

// Mock pythonRunner
jest.mock('../src/pythonRunner', () => ({
    runPythonJSON: jest.fn(async () => ({
        success: true,
        output: '/tmp/test.pptx',
        slides: 5,
        size: 12345,
    })),
    isPythonAvailable: jest.fn(async () => true),
    findPythonBin: jest.fn(async () => 'python3'),
    resetPythonBinCache: jest.fn(),
    TOOLS_DIR: '/mock/tools',
    DEFAULT_TIMEOUT: 60000,
}));

// Mock fs (sync operations used by pptxHandler)
jest.mock('fs', () => ({
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
    readFileSync: jest.fn(() => Buffer.from('fake-pptx-content')),
    unlinkSync: jest.fn(),
}));

const {
    validateSlideSpec,
    detectPptxRequest,
    createPptxFromSpec,
    generatePptx,
    sendPptx,
    cleanupFiles,
    PPTX_MIMETYPE,
    VALID_SLIDE_TYPES,
    MAX_SLIDES,
    MIN_SLIDES,
} = require('../src/pptxHandler');

const { runPythonJSON, isPythonAvailable } = require('../src/pythonRunner');
const fs = require('fs');

beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply mock implementations after reset
    runPythonJSON.mockResolvedValue({
        success: true,
        output: '/tmp/test.pptx',
        slides: 5,
        size: 12345,
    });
    isPythonAvailable.mockResolvedValue(true);
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(Buffer.from('fake-pptx-content'));
});

// ═══════════════════════════════════════════════════════════
//  VALID SLIDE SPEC FACTORY
// ═══════════════════════════════════════════════════════════

const makeValidSpec = (overrides = {}) => ({
    title: 'Test Presentation',
    subtitle: 'Test Subtitle',
    slides: [
        { type: 'title' },
        { type: 'bullets', heading: 'Slide 2', bullets: ['Point 1', 'Point 2'] },
        { type: 'bullets', heading: 'Slide 3', bullets: ['Point 3', 'Point 4'] },
        { type: 'bullets', heading: 'Slide 4', bullets: ['Point 5', 'Point 6'] },
        { type: 'summary', heading: 'Ringkasan', bullets: ['Key 1'], next_steps: ['Next 1'] },
    ],
    notes: { enabled: true, per_slide: ['Note 1', 'Note 2', 'Note 3', 'Note 4', 'Note 5'] },
    ...overrides,
});

describe('pptxHandler', () => {
    // ─── validateSlideSpec ──────────────────────────────────
    describe('validateSlideSpec', () => {
        test('should accept a valid spec', () => {
            const result = validateSlideSpec(makeValidSpec());
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should reject null spec', () => {
            const result = validateSlideSpec(null);
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('JSON object');
        });

        test('should reject non-object spec', () => {
            const result = validateSlideSpec('string');
            expect(result.valid).toBe(false);
        });

        test('should reject missing title', () => {
            const result = validateSlideSpec({ slides: [{ type: 'title' }] });
            expect(result.valid).toBe(false);
            expect(result.errors).toEqual(expect.arrayContaining([
                expect.stringContaining('title'),
            ]));
        });

        test('should reject empty title', () => {
            const result = validateSlideSpec({ title: '  ', slides: [{ type: 'title' }] });
            expect(result.valid).toBe(false);
        });

        test('should reject non-string title', () => {
            const result = validateSlideSpec({ title: 123, slides: [{ type: 'title' }] });
            expect(result.valid).toBe(false);
        });

        test('should reject missing slides', () => {
            const result = validateSlideSpec({ title: 'Test' });
            expect(result.valid).toBe(false);
            expect(result.errors).toEqual(expect.arrayContaining([
                expect.stringContaining('slides'),
            ]));
        });

        test('should reject non-array slides', () => {
            const result = validateSlideSpec({ title: 'Test', slides: 'not array' });
            expect(result.valid).toBe(false);
        });

        test('should reject empty slides array', () => {
            const result = validateSlideSpec({ title: 'Test', slides: [] });
            expect(result.valid).toBe(false);
            expect(result.errors).toEqual(expect.arrayContaining([
                expect.stringContaining('at least'),
            ]));
        });

        test('should reject more than MAX_SLIDES slides', () => {
            const slides = Array(21).fill({ type: 'bullets', heading: 'X', bullets: ['Y'] });
            const result = validateSlideSpec({ title: 'Test', slides });
            expect(result.valid).toBe(false);
            expect(result.errors).toEqual(expect.arrayContaining([
                expect.stringContaining('at most'),
            ]));
        });

        test('should reject invalid slide type', () => {
            const result = validateSlideSpec({
                title: 'Test',
                slides: [{ type: 'unknown' }],
            });
            expect(result.valid).toBe(false);
            expect(result.errors).toEqual(expect.arrayContaining([
                expect.stringContaining("'unknown'"),
            ]));
        });

        test('should reject non-object slide entry', () => {
            const result = validateSlideSpec({
                title: 'Test',
                slides: ['not an object'],
            });
            expect(result.valid).toBe(false);
            expect(result.errors).toEqual(expect.arrayContaining([
                expect.stringContaining('must be an object'),
            ]));
        });

        test('should reject non-array bullets', () => {
            const result = validateSlideSpec({
                title: 'Test',
                slides: [{ type: 'bullets', heading: 'X', bullets: 'not array' }],
            });
            expect(result.valid).toBe(false);
            expect(result.errors).toEqual(expect.arrayContaining([
                expect.stringContaining('bullets must be an array'),
            ]));
        });

        test('should reject non-array next_steps in summary', () => {
            const result = validateSlideSpec({
                title: 'Test',
                slides: [{ type: 'summary', heading: 'X', bullets: [], next_steps: 'not array' }],
            });
            expect(result.valid).toBe(false);
            expect(result.errors).toEqual(expect.arrayContaining([
                expect.stringContaining('next_steps must be an array'),
            ]));
        });

        test('should accept valid notes config', () => {
            const result = validateSlideSpec({
                title: 'Test',
                slides: [{ type: 'title' }],
                notes: { enabled: true, per_slide: ['Note'] },
            });
            expect(result.valid).toBe(true);
        });

        test('should reject non-object notes', () => {
            const result = validateSlideSpec({
                title: 'Test',
                slides: [{ type: 'title' }],
                notes: 'bad',
            });
            expect(result.valid).toBe(false);
            expect(result.errors).toEqual(expect.arrayContaining([
                expect.stringContaining('notes'),
            ]));
        });

        test('should reject non-array notes.per_slide', () => {
            const result = validateSlideSpec({
                title: 'Test',
                slides: [{ type: 'title' }],
                notes: { enabled: true, per_slide: 'not array' },
            });
            expect(result.valid).toBe(false);
        });

        test('should accept spec without notes (optional)', () => {
            const result = validateSlideSpec({
                title: 'Test',
                slides: [{ type: 'title' }],
            });
            expect(result.valid).toBe(true);
        });

        test('should accept spec without subtitle', () => {
            const result = validateSlideSpec({
                title: 'Test',
                slides: [{ type: 'title' }, { type: 'bullets', heading: 'H', bullets: ['B'] }],
            });
            expect(result.valid).toBe(true);
        });

        test('should default slide type to bullets for validation', () => {
            const result = validateSlideSpec({
                title: 'Test',
                slides: [{ heading: 'No type specified', bullets: ['B'] }],
            });
            expect(result.valid).toBe(true);
        });

        test('should report multiple errors at once', () => {
            const result = validateSlideSpec({});
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThanOrEqual(2);
        });
    });

    // ─── detectPptxRequest ──────────────────────────────────
    describe('detectPptxRequest', () => {
        test('should detect "pptx" keyword', () => {
            const result = detectPptxRequest('kirimin ke aku dalam bentuk file .pptx aja');
            expect(result.isPptxRequest).toBe(true);
        });

        test('should detect "ppt" keyword', () => {
            const result = detectPptxRequest('bikin file ppt dong');
            expect(result.isPptxRequest).toBe(true);
        });

        test('should detect "powerpoint" keyword', () => {
            const result = detectPptxRequest('buatin presentasi powerpoint');
            expect(result.isPptxRequest).toBe(true);
        });

        test('should detect "presentasi" keyword', () => {
            const result = detectPptxRequest('bikin presentasi 5 slide');
            expect(result.isPptxRequest).toBe(true);
        });

        test('should detect "slide" keyword', () => {
            const result = detectPptxRequest('buatin 5 slide soal AI');
            expect(result.isPptxRequest).toBe(true);
        });

        test('should extract slide count', () => {
            const result = detectPptxRequest('bikin pptx 5 slide');
            expect(result.isPptxRequest).toBe(true);
            expect(result.slideCount).toBe(5);
        });

        test('should extract slide count from various formats', () => {
            expect(detectPptxRequest('3 slide presentasi').slideCount).toBe(3);
            expect(detectPptxRequest('buat 10 slide pptx').slideCount).toBe(10);
        });

        test('should cap slide count at MAX_SLIDES', () => {
            const result = detectPptxRequest('bikin 50 slide presentasi');
            expect(result.slideCount).toBe(MAX_SLIDES);
        });

        test('should enforce minimum slide count', () => {
            const result = detectPptxRequest('bikin 1 slide pptx');
            expect(result.slideCount).toBe(2);
        });

        test('should default to 5 slides when no count specified', () => {
            const result = detectPptxRequest('bikin pptx dong');
            expect(result.slideCount).toBe(5);
        });

        test('should return false for non-pptx requests', () => {
            expect(detectPptxRequest('halo apa kabar').isPptxRequest).toBe(false);
            expect(detectPptxRequest('bikin file txt').isPptxRequest).toBe(false);
            expect(detectPptxRequest('').isPptxRequest).toBe(false);
        });

        test('should return false for null/undefined', () => {
            expect(detectPptxRequest(null).isPptxRequest).toBe(false);
            expect(detectPptxRequest(undefined).isPptxRequest).toBe(false);
        });

        test('should be case-insensitive', () => {
            expect(detectPptxRequest('BIKIN PPTX').isPptxRequest).toBe(true);
            expect(detectPptxRequest('Presentasi').isPptxRequest).toBe(true);
        });
    });

    // ─── createPptxFromSpec ─────────────────────────────────
    describe('createPptxFromSpec', () => {
        test('should create PPTX from valid spec', async () => {
            const result = await createPptxFromSpec(makeValidSpec());
            expect(result.success).toBe(true);
            expect(result.type).toBe('pptx');
            expect(result.fileName).toContain('.pptx');
            expect(result.mimetype).toBe(PPTX_MIMETYPE);
        });

        test('should return error for invalid spec', async () => {
            const result = await createPptxFromSpec({});
            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid slide spec');
        });

        test('should return error when python is unavailable', async () => {
            isPythonAvailable.mockResolvedValue(false);

            const result = await createPptxFromSpec(makeValidSpec());
            expect(result.success).toBe(false);
            expect(result.error).toContain('Python is not available');
        });

        test('should return error when generation fails', async () => {
            runPythonJSON.mockRejectedValue(new Error('python-pptx not installed'));

            const result = await createPptxFromSpec(makeValidSpec());
            expect(result.success).toBe(false);
            expect(result.error).toContain('python-pptx not installed');
        });

        test('should pass custom output filename', async () => {
            const result = await createPptxFromSpec(makeValidSpec(), 'custom.pptx');
            expect(result.success).toBe(true);
            expect(result.fileName).toBe('custom.pptx');
        });

        test('should include slide count in result', async () => {
            const result = await createPptxFromSpec(makeValidSpec());
            expect(result.success).toBe(true);
            expect(result.slideCount).toBe(5);
        });
    });

    // ─── generatePptx ───────────────────────────────────────
    describe('generatePptx', () => {
        test('should write spec to temp file and call python', async () => {
            const spec = makeValidSpec();
            await generatePptx(spec);

            expect(fs.writeFileSync).toHaveBeenCalled();
            expect(runPythonJSON).toHaveBeenCalledWith(
                'pptx_generator.py',
                expect.arrayContaining(['--in', expect.any(String), '--out', expect.any(String)]),
            );
        });

        test('should throw on python error', async () => {
            runPythonJSON.mockRejectedValue(new Error('Python crashed'));

            await expect(generatePptx(makeValidSpec())).rejects.toThrow('Python crashed');
        });

        test('should throw on unsuccessful result', async () => {
            runPythonJSON.mockResolvedValue({ success: false, error: 'Bad slide' });

            await expect(generatePptx(makeValidSpec())).rejects.toThrow('Bad slide');
        });

        test('should generate filename from title', async () => {
            const result = await generatePptx(makeValidSpec({ title: 'My Cool Presentation' }));
            expect(result.fileName).toContain('My_Cool_Presentation');
            expect(result.fileName).toEndWith('.pptx');
        });

        test('should use custom filename when provided', async () => {
            const result = await generatePptx(makeValidSpec(), 'output.pptx');
            expect(result.fileName).toBe('output.pptx');
        });

        test('should cleanup spec file on success', async () => {
            await generatePptx(makeValidSpec());
            // unlinkSync should be called for spec cleanup
            expect(fs.unlinkSync).toHaveBeenCalled();
        });

        test('should cleanup both files on error', async () => {
            runPythonJSON.mockRejectedValue(new Error('fail'));

            await expect(generatePptx(makeValidSpec())).rejects.toThrow();
            // Both spec and output should be attempted cleanup
            expect(fs.unlinkSync).toHaveBeenCalled();
        });
    });

    // ─── sendPptx ───────────────────────────────────────────
    describe('sendPptx', () => {
        const makeSock = () => ({
            sendMessage: jest.fn(async () => ({})),
        });

        test('should send PPTX as document with correct mimetype', async () => {
            const sock = makeSock();
            await sendPptx(sock, '628xxx@s.whatsapp.net', '/tmp/test.pptx', 'test.pptx');

            expect(sock.sendMessage).toHaveBeenCalledWith(
                '628xxx@s.whatsapp.net',
                expect.objectContaining({
                    document: expect.any(Buffer),
                    mimetype: PPTX_MIMETYPE,
                    fileName: 'test.pptx',
                }),
                {},
            );
        });

        test('should add .pptx extension if missing', async () => {
            const sock = makeSock();
            await sendPptx(sock, 'chat@s.whatsapp.net', '/tmp/test.pptx', 'noext');

            const callArgs = sock.sendMessage.mock.calls[0][1];
            expect(callArgs.fileName).toBe('noext.pptx');
        });

        test('should pass quoted option when provided', async () => {
            const sock = makeSock();
            const quoted = { key: { id: 'quoted123' } };
            await sendPptx(sock, 'chat@s.whatsapp.net', '/tmp/test.pptx', 'test.pptx', { quoted });

            expect(sock.sendMessage).toHaveBeenCalledWith(
                'chat@s.whatsapp.net',
                expect.any(Object),
                { quoted },
            );
        });

        test('should use custom caption when provided', async () => {
            const sock = makeSock();
            await sendPptx(sock, 'chat@s.whatsapp.net', '/tmp/test.pptx', 'test.pptx', {
                caption: 'Custom caption',
            });

            const callArgs = sock.sendMessage.mock.calls[0][1];
            expect(callArgs.caption).toBe('Custom caption');
        });

        test('should cleanup file after sending', async () => {
            const sock = makeSock();
            await sendPptx(sock, 'chat@s.whatsapp.net', '/tmp/test.pptx', 'test.pptx');

            expect(fs.unlinkSync).toHaveBeenCalled();
        });

        test('should return true on success', async () => {
            const sock = makeSock();
            const result = await sendPptx(sock, 'chat@s.whatsapp.net', '/tmp/test.pptx', 'test.pptx');
            expect(result).toBe(true);
        });
    });

    // ─── cleanupFiles ───────────────────────────────────────
    describe('cleanupFiles', () => {
        test('should attempt to delete multiple files', () => {
            cleanupFiles('/tmp/a.json', '/tmp/b.pptx');
            expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
        });

        test('should skip null/undefined paths', () => {
            cleanupFiles(null, undefined, '/tmp/c.json');
            expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
        });

        test('should not throw if file does not exist', () => {
            fs.existsSync.mockReturnValue(false);
            expect(() => cleanupFiles('/tmp/missing.json')).not.toThrow();
        });
    });

    // ─── Constants ──────────────────────────────────────────
    describe('constants', () => {
        test('PPTX_MIMETYPE should be correct OOXML type', () => {
            expect(PPTX_MIMETYPE).toBe(
                'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            );
        });

        test('VALID_SLIDE_TYPES should include title, bullets, summary', () => {
            expect(VALID_SLIDE_TYPES.has('title')).toBe(true);
            expect(VALID_SLIDE_TYPES.has('bullets')).toBe(true);
            expect(VALID_SLIDE_TYPES.has('summary')).toBe(true);
        });

        test('MAX_SLIDES should be 20', () => {
            expect(MAX_SLIDES).toBe(20);
        });

        test('MIN_SLIDES should be 1', () => {
            expect(MIN_SLIDES).toBe(1);
        });
    });
});

// Custom jest matcher for string endings
expect.extend({
    toEndWith(received, suffix) {
        const pass = received.endsWith(suffix);
        return {
            pass,
            message: () => `expected "${received}" to end with "${suffix}"`,
        };
    },
});
