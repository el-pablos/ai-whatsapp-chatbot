/**
 * Tests for PDF Editor Handler
 */

const mockPage = {};
const mockPdf = {
    getPageCount: jest.fn(),
    getPageIndices: jest.fn(),
    getTitle: jest.fn(),
    getAuthor: jest.fn(),
    copyPages: jest.fn(),
    addPage: jest.fn(),
    save: jest.fn(),
};

jest.mock('pdf-lib', () => ({
    PDFDocument: {
        create: jest.fn(),
        load: jest.fn(),
    },
}));

const {
    mergePDFs,
    extractPages,
    getPDFInfo,
    parsePDFCommand,
    parsePageRange,
} = require('../src/pdfEditorHandler');

const { PDFDocument } = require('pdf-lib');

describe('PDF Editor Handler', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        mockPdf.getPageCount.mockReturnValue(5);
        mockPdf.getPageIndices.mockReturnValue([0, 1, 2, 3, 4]);
        mockPdf.getTitle.mockReturnValue('Test PDF');
        mockPdf.getAuthor.mockReturnValue('Author');
        mockPdf.copyPages.mockResolvedValue([mockPage, mockPage]);
        mockPdf.addPage.mockReturnValue(undefined);
        mockPdf.save.mockResolvedValue(new Uint8Array([1, 2, 3]));
        PDFDocument.create.mockResolvedValue(mockPdf);
        PDFDocument.load.mockResolvedValue(mockPdf);
    });

    describe('parsePageRange', () => {
        test('should parse single pages', () => {
            expect(parsePageRange('1,3,5')).toEqual([1, 3, 5]);
        });

        test('should parse range', () => {
            expect(parsePageRange('1-5')).toEqual([1, 2, 3, 4, 5]);
        });

        test('should parse mixed', () => {
            expect(parsePageRange('1,3-5,8')).toEqual([1, 3, 4, 5, 8]);
        });

        test('should deduplicate', () => {
            expect(parsePageRange('1,1,2,2')).toEqual([1, 2]);
        });

        test('should sort ascending', () => {
            expect(parsePageRange('5,1,3')).toEqual([1, 3, 5]);
        });

        test('should handle reverse range', () => {
            expect(parsePageRange('5-3')).toEqual([3, 4, 5]);
        });
    });

    describe('parsePDFCommand', () => {
        test('should parse /pdf merge', () => {
            expect(parsePDFCommand('/pdf merge')).toEqual({ action: 'merge', params: null });
        });

        test('should parse /pdf info', () => {
            expect(parsePDFCommand('/pdf info')).toEqual({ action: 'info', params: null });
        });

        test('should parse /pdf extract pages', () => {
            const result = parsePDFCommand('/pdf extract 1,3-5');
            expect(result.action).toBe('extract');
            expect(result.params.pages).toEqual([1, 3, 4, 5]);
        });

        test('should return null for unknown command', () => {
            expect(parsePDFCommand('/pdf unknown')).toBeNull();
        });

        test('should return null for empty', () => {
            expect(parsePDFCommand('')).toBeNull();
            expect(parsePDFCommand(null)).toBeNull();
        });
    });

    describe('getPDFInfo', () => {
        test('should return PDF info', async () => {
            const result = await getPDFInfo(Buffer.from('fake'));
            expect(result.pageCount).toBe(5);
            expect(result.title).toBe('Test PDF');
            expect(result.author).toBe('Author');
        });
    });

    describe('mergePDFs', () => {
        test('should merge multiple PDFs', async () => {
            const result = await mergePDFs([Buffer.from('a'), Buffer.from('b')]);
            expect(Buffer.isBuffer(result)).toBe(true);
        });

        test('should throw for less than 2 PDFs', async () => {
            await expect(mergePDFs([Buffer.from('a')])).rejects.toThrow('Minimal 2');
        });

        test('should throw for empty array', async () => {
            await expect(mergePDFs([])).rejects.toThrow();
        });

        test('should throw for null', async () => {
            await expect(mergePDFs(null)).rejects.toThrow();
        });
    });

    describe('extractPages', () => {
        test('should extract specified pages', async () => {
            const result = await extractPages(Buffer.from('fake'), [1, 3]);
            expect(Buffer.isBuffer(result)).toBe(true);
        });

        test('should throw for empty buffer', async () => {
            await expect(extractPages(null, [1])).rejects.toThrow();
        });

        test('should throw for empty page numbers', async () => {
            await expect(extractPages(Buffer.from('fake'), [])).rejects.toThrow();
        });
    });
});
