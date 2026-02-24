/**
 * Unit Tests - File Creator
 * 
 * Test cases for:
 * 1. parseFileMarker - Detect [FILE:name.ext] markers in AI response
 * 2. detectFileRequest - Detect user requests to create files
 * 3. sanitizeFileName - Filename sanitization
 * 4. getMimeType - MIME type detection
 * 5. preText support - Handle intro text before file marker
 * 
 * @version 2.5.1
 */

const {
    parseFileMarker,
    detectFileRequest,
    sanitizeFileName,
    getMimeType,
    FILE_MARKER_REGEX,
    MIME_TYPES
} = require('../src/fileCreator');

describe('File Creator', () => {

    // ═══════════════════════════════════════════════════════════
    // parseFileMarker Tests
    // ═══════════════════════════════════════════════════════════
    describe('parseFileMarker', () => {

        describe('Basic marker detection', () => {
            it('should parse marker at the start of response', () => {
                const result = parseFileMarker('[FILE:report.txt]\nHello world content');
                expect(result).not.toBeNull();
                expect(result.hasFile).toBe(true);
                expect(result.fileName).toBe('report.txt');
                expect(result.extension).toBe('txt');
                expect(result.content).toBe('Hello world content');
                expect(result.preText).toBe('');
            });

            it('should parse marker with intro text before it (BUG FIX)', () => {
                const response = 'siap Tamas! w bikinin file txt nya sekarang, gas! 🔥\n[FILE:analisis_jurnal_sosiologika.txt]\n\nAnalisis Jurnal Sosiologika...';
                const result = parseFileMarker(response);
                expect(result).not.toBeNull();
                expect(result.hasFile).toBe(true);
                expect(result.fileName).toBe('analisis_jurnal_sosiologika.txt');
                expect(result.extension).toBe('txt');
                expect(result.preText).toBe('siap Tamas! w bikinin file txt nya sekarang, gas! 🔥');
                expect(result.content).toBe('Analisis Jurnal Sosiologika...');
            });

            it('should parse marker with multiple lines of intro text', () => {
                const response = 'oke bro!\nw buatin ya\n\n[FILE:data.csv]\ncol1,col2\nval1,val2';
                const result = parseFileMarker(response);
                expect(result).not.toBeNull();
                expect(result.fileName).toBe('data.csv');
                expect(result.preText).toBe('oke bro!\nw buatin ya');
                expect(result.content).toBe('col1,col2\nval1,val2');
            });

            it('should handle markdown file', () => {
                const result = parseFileMarker('[FILE:notes.md]\n# Title\n\nContent here');
                expect(result).not.toBeNull();
                expect(result.fileName).toBe('notes.md');
                expect(result.extension).toBe('md');
                expect(result.mimetype).toBe('text/markdown');
            });

            it('should handle json file', () => {
                const result = parseFileMarker('[FILE:config.json]\n{"key": "value"}');
                expect(result).not.toBeNull();
                expect(result.extension).toBe('json');
                expect(result.mimetype).toBe('application/json');
            });

            it('should handle html file', () => {
                const result = parseFileMarker('[FILE:page.html]\n<html><body>Hello</body></html>');
                expect(result).not.toBeNull();
                expect(result.extension).toBe('html');
                expect(result.mimetype).toBe('text/html');
            });
        });

        describe('Edge cases', () => {
            it('should return null for null input', () => {
                expect(parseFileMarker(null)).toBeNull();
            });

            it('should return null for empty string', () => {
                expect(parseFileMarker('')).toBeNull();
            });

            it('should return null for undefined', () => {
                expect(parseFileMarker(undefined)).toBeNull();
            });

            it('should return null for response without marker', () => {
                expect(parseFileMarker('Hello world, no file marker here')).toBeNull();
            });

            it('should return null for filename > 200 chars', () => {
                const longName = 'a'.repeat(201) + '.txt';
                expect(parseFileMarker(`[FILE:${longName}]\ncontent`)).toBeNull();
            });

            it('should handle filename without common extension', () => {
                const result = parseFileMarker('[FILE:noextension]\ncontent');
                expect(result).not.toBeNull();
                expect(result.extension).toBe('noextension');
            });

            it('should handle filename with spaces', () => {
                const result = parseFileMarker('[FILE:my report.txt]\ncontent');
                expect(result).not.toBeNull();
                expect(result.fileName).toBe('my report.txt');
            });

            it('should trim whitespace around filename', () => {
                const result = parseFileMarker('[FILE:  report.txt  ]\ncontent');
                expect(result).not.toBeNull();
                expect(result.fileName).toBe('report.txt');
            });

            it('should handle empty content after marker', () => {
                const result = parseFileMarker('[FILE:empty.txt]');
                expect(result).not.toBeNull();
                expect(result.content).toBe('');
            });
        });

        describe('preText extraction', () => {
            it('should return empty preText when marker is at start', () => {
                const result = parseFileMarker('[FILE:test.txt]\ncontent');
                expect(result.preText).toBe('');
            });

            it('should extract single line preText', () => {
                const result = parseFileMarker('nih file nya!\n[FILE:test.txt]\ncontent');
                expect(result.preText).toBe('nih file nya!');
            });

            it('should extract multi-line preText', () => {
                const result = parseFileMarker('line1\nline2\nline3\n[FILE:test.txt]\ncontent');
                expect(result.preText).toBe('line1\nline2\nline3');
            });

            it('should trim preText whitespace', () => {
                const result = parseFileMarker('  hello  \n\n[FILE:test.txt]\ncontent');
                expect(result.preText).toBe('hello');
            });
        });
    });

    // ═══════════════════════════════════════════════════════════
    // FILE_MARKER_REGEX Tests
    // ═══════════════════════════════════════════════════════════
    describe('FILE_MARKER_REGEX', () => {
        it('should match marker at start', () => {
            expect('[FILE:test.txt]\ncontent'.match(FILE_MARKER_REGEX)).not.toBeNull();
        });

        it('should match marker NOT at start (no ^ anchor)', () => {
            expect('intro text\n[FILE:test.txt]\ncontent'.match(FILE_MARKER_REGEX)).not.toBeNull();
        });

        it('should NOT match incomplete marker', () => {
            expect('[FILE:]\ncontent'.match(FILE_MARKER_REGEX)).toBeNull();
        });

        it('should capture filename', () => {
            const match = '[FILE:report.md]\ncontent'.match(FILE_MARKER_REGEX);
            expect(match[1]).toBe('report.md');
        });
    });

    // ═══════════════════════════════════════════════════════════
    // detectFileRequest Tests
    // ═══════════════════════════════════════════════════════════
    describe('detectFileRequest', () => {

        describe('Should detect file requests', () => {
            it('should detect "buatkan file txt"', () => {
                const result = detectFileRequest('buatkan file txt');
                expect(result.isFileRequest).toBe(true);
                expect(result.format).toBe('txt');
            });

            it('should detect "bikin file markdown"', () => {
                const result = detectFileRequest('bikin file markdown');
                expect(result.isFileRequest).toBe(true);
                expect(result.format).toBe('md');
            });

            it('should detect "dalam format .md"', () => {
                const result = detectFileRequest('tulis laporan dalam format .md');
                expect(result.isFileRequest).toBe(true);
            });

            it('should detect "export ke csv"', () => {
                const result = detectFileRequest('export ke csv');
                expect(result.isFileRequest).toBe(true);
                expect(result.format).toBe('csv');
            });

            it('should detect "file .txt"', () => {
                const result = detectFileRequest('bisa kirim ke aku dalam bentuk file .txt?');
                expect(result.isFileRequest).toBe(true);
                expect(result.format).toBe('txt');
            });

            it('should detect "bikinin file txt" (Indonesian suffix -in)', () => {
                const result = detectFileRequest('bikinin file txt nya dong');
                expect(result.isFileRequest).toBe(true);
                expect(result.format).toBe('txt');
            });

            it('should detect "buatin file md"', () => {
                const result = detectFileRequest('buatin file md nya');
                expect(result.isFileRequest).toBe(true);
                expect(result.format).toBe('md');
            });

            it('should detect "bikinkan file json"', () => {
                const result = detectFileRequest('bikinkan file json');
                expect(result.isFileRequest).toBe(true);
                expect(result.format).toBe('json');
            });

            it('should detect generic "buatkan file"', () => {
                const result = detectFileRequest('buatkan file nya dong');
                expect(result.isFileRequest).toBe(true);
            });

            it('should detect "bikinin file" generic', () => {
                const result = detectFileRequest('bikinin file nya');
                expect(result.isFileRequest).toBe(true);
            });

            it('should detect "create file html"', () => {
                const result = detectFileRequest('create file html');
                expect(result.isFileRequest).toBe(true);
                expect(result.format).toBe('html');
            });
        });

        describe('Should NOT detect file requests', () => {
            it('should not detect normal chat', () => {
                expect(detectFileRequest('hai apa kabar').isFileRequest).toBe(false);
            });

            it('should not detect null', () => {
                expect(detectFileRequest(null).isFileRequest).toBe(false);
            });

            it('should not detect empty string', () => {
                expect(detectFileRequest('').isFileRequest).toBe(false);
            });

            it('should not detect "file" without context', () => {
                expect(detectFileRequest('file apa ini').isFileRequest).toBe(false);
            });
        });
    });

    // ═══════════════════════════════════════════════════════════
    // sanitizeFileName Tests
    // ═══════════════════════════════════════════════════════════
    describe('sanitizeFileName', () => {
        it('should keep clean filenames unchanged', () => {
            expect(sanitizeFileName('report.txt')).toBe('report.txt');
        });

        it('should replace invalid characters with underscore', () => {
            expect(sanitizeFileName('file<name>.txt')).toBe('file_name_.txt');
        });

        it('should handle colons', () => {
            expect(sanitizeFileName('file:name.txt')).toBe('file_name.txt');
        });

        it('should handle pipe character', () => {
            expect(sanitizeFileName('file|name.txt')).toBe('file_name.txt');
        });
    });

    // ═══════════════════════════════════════════════════════════
    // getMimeType Tests
    // ═══════════════════════════════════════════════════════════
    describe('getMimeType', () => {
        it('should return correct MIME for txt', () => {
            expect(getMimeType('txt')).toBe('text/plain');
        });

        it('should return correct MIME for md', () => {
            expect(getMimeType('md')).toBe('text/markdown');
        });

        it('should return correct MIME for json', () => {
            expect(getMimeType('json')).toBe('application/json');
        });

        it('should return correct MIME for csv', () => {
            expect(getMimeType('csv')).toBe('text/csv');
        });

        it('should return correct MIME for html', () => {
            expect(getMimeType('html')).toBe('text/html');
        });

        it('should return default for unknown extension', () => {
            expect(getMimeType('xyz')).toBe('application/octet-stream');
        });
    });
});
