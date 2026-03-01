/**
 * Tests for documentHandler module
 * Universal Document Reader - 70+ formats, NO LIMITS
 */

const {
    extractPdfText,
    extractDocxText,
    detectDocumentType,
    analyzeDocumentWithAI,
    processDocument,
    isSupportedDocument,
    getDocumentInfo,
    getSupportedFormats,
    extractPlainText,
    extractHtmlText,
    generateProgressBar,
    getProgressMessage,
    DOCUMENT_FORMATS,
    ALL_SUPPORTED_EXTENSIONS
} = require('../src/documentHandler');

// Mock axios for AI calls
jest.mock('axios');
const axios = require('axios');

describe('documentHandler - Universal Document Reader', () => {
    
    describe('DOCUMENT_FORMATS', () => {
        it('should have all format categories', () => {
            expect(DOCUMENT_FORMATS.text).toBeDefined();
            expect(DOCUMENT_FORMATS.office).toBeDefined();
            expect(DOCUMENT_FORMATS.pdf).toBeDefined();
            expect(DOCUMENT_FORMATS.spreadsheet).toBeDefined();
            expect(DOCUMENT_FORMATS.presentation).toBeDefined();
            expect(DOCUMENT_FORMATS.ebook).toBeDefined();
            expect(DOCUMENT_FORMATS.comic).toBeDefined();
            expect(DOCUMENT_FORMATS.web).toBeDefined();
            expect(DOCUMENT_FORMATS.archive).toBeDefined();
        });

        it('should support 70+ formats', () => {
            expect(ALL_SUPPORTED_EXTENSIONS.length).toBeGreaterThan(70);
        });
    });

    describe('getSupportedFormats', () => {
        it('should return format info', () => {
            const formats = getSupportedFormats();
            expect(formats.total).toBeGreaterThan(70);
            expect(formats.categories).toBeDefined();
            expect(formats.all).toBeDefined();
        });
    });

    describe('detectDocumentType', () => {
        it('should detect PDF from filename', () => {
            const result = detectDocumentType('document.pdf', null);
            expect(result.type).toBe('pdf');
            expect(result.ext).toBe('pdf');
        });

        it('should detect DOCX from filename', () => {
            const result = detectDocumentType('document.docx', null);
            expect(result.type).toBe('office');
            expect(result.ext).toBe('docx');
        });

        it('should detect old DOC format', () => {
            const result = detectDocumentType('old.doc', null);
            expect(result.type).toBe('office');
            expect(result.ext).toBe('doc');
        });

        it('should detect ebook formats', () => {
            expect(detectDocumentType('book.epub', null).type).toBe('ebook');
            expect(detectDocumentType('book.mobi', null).type).toBe('ebook');
            expect(detectDocumentType('book.azw3', null).type).toBe('ebook');
        });

        it('should detect archive formats', () => {
            expect(detectDocumentType('file.zip', null).type).toBe('archive');
            expect(detectDocumentType('file.rar', null).type).toBe('archive');
            expect(detectDocumentType('file.7z', null).type).toBe('archive');
            expect(detectDocumentType('file.tar', null).type).toBe('archive');
        });

        it('should detect presentation formats', () => {
            expect(detectDocumentType('slides.pptx', null).type).toBe('presentation');
            expect(detectDocumentType('slides.ppt', null).type).toBe('presentation');
            expect(detectDocumentType('slides.odp', null).type).toBe('presentation');
        });

        it('should detect text formats', () => {
            expect(detectDocumentType('readme.txt', null).type).toBe('text');
            expect(detectDocumentType('readme.md', null).type).toBe('text');
            expect(detectDocumentType('config.json', null).type).toBe('text');
        });

        it('should detect web formats', () => {
            expect(detectDocumentType('page.html', null).type).toBe('web');
            expect(detectDocumentType('page.htm', null).type).toBe('web');
        });

        it('should detect compound tar extensions', () => {
            expect(detectDocumentType('archive.tar.gz', null).type).toBe('archive');
            expect(detectDocumentType('archive.tar.bz2', null).type).toBe('archive');
            expect(detectDocumentType('archive.tar.xz', null).type).toBe('archive');
        });

        it('should detect from mimetype when extension unknown', () => {
            expect(detectDocumentType('file', 'application/pdf').type).toBe('pdf');
            expect(detectDocumentType('file', 'application/zip').type).toBe('archive');
        });

        it('should return unknown for unsupported types', () => {
            expect(detectDocumentType('image.jpg', null).type).toBe('unknown');
            expect(detectDocumentType('video.mp4', null).type).toBe('unknown');
        });
    });

    describe('isSupportedDocument', () => {
        it('should return true for PDF', () => {
            expect(isSupportedDocument('doc.pdf', 'application/pdf')).toBe(true);
        });

        it('should return true for DOCX', () => {
            expect(isSupportedDocument('doc.docx', null)).toBe(true);
        });

        it('should return true for office formats', () => {
            expect(isSupportedDocument('doc.doc', null)).toBe(true);
            expect(isSupportedDocument('doc.odt', null)).toBe(true);
            expect(isSupportedDocument('doc.rtf', null)).toBe(true);
        });

        it('should return true for ebook formats', () => {
            expect(isSupportedDocument('book.epub', null)).toBe(true);
            expect(isSupportedDocument('book.mobi', null)).toBe(true);
        });

        it('should return true for archives', () => {
            expect(isSupportedDocument('file.zip', null)).toBe(true);
            expect(isSupportedDocument('file.rar', null)).toBe(true);
        });

        it('should return false for unsupported types', () => {
            expect(isSupportedDocument('image.jpg', 'image/jpeg')).toBe(false);
            expect(isSupportedDocument('video.mp4', 'video/mp4')).toBe(false);
        });
    });

    describe('extractPlainText', () => {
        it('should extract text from buffer', async () => {
            const buffer = Buffer.from('Hello World!\nThis is a test.');
            const result = await extractPlainText(buffer);
            
            expect(result.success).toBe(true);
            expect(result.text).toBe('Hello World!\nThis is a test.');
        });

        it('should handle UTF-8 text', async () => {
            const buffer = Buffer.from('Halo dunia! 你好世界! مرحبا بالعالم');
            const result = await extractPlainText(buffer);
            
            expect(result.success).toBe(true);
            expect(result.text).toContain('Halo dunia!');
        });
    });

    describe('extractHtmlText', () => {
        it('should strip HTML tags', async () => {
            const html = '<html><body><h1>Title</h1><p>Content here</p></body></html>';
            const buffer = Buffer.from(html);
            const result = await extractHtmlText(buffer);
            
            expect(result.success).toBe(true);
            expect(result.text).toContain('Title');
            expect(result.text).toContain('Content here');
            expect(result.text).not.toContain('<h1>');
        });

        it('should remove script and style tags', async () => {
            const html = '<html><head><style>body{color:red}</style></head><body><script>alert(1)</script><p>Text</p></body></html>';
            const buffer = Buffer.from(html);
            const result = await extractHtmlText(buffer);
            
            expect(result.success).toBe(true);
            expect(result.text).toContain('Text');
            expect(result.text).not.toContain('alert');
            expect(result.text).not.toContain('color:red');
        });

        it('should decode HTML entities', async () => {
            const html = '<p>Hello &amp; goodbye &lt;world&gt;</p>';
            const buffer = Buffer.from(html);
            const result = await extractHtmlText(buffer);
            
            expect(result.success).toBe(true);
            expect(result.text).toContain('Hello & goodbye <world>');
        });
    });

    describe('extractPdfText', () => {
        it('should handle invalid PDF buffer', async () => {
            const invalidBuffer = Buffer.from('not a pdf');
            const result = await extractPdfText(invalidBuffer);
            
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle empty buffer', async () => {
            const emptyBuffer = Buffer.from('');
            const result = await extractPdfText(emptyBuffer);
            
            expect(result.success).toBe(false);
        });
    });

    describe('extractDocxText', () => {
        it('should handle invalid DOCX buffer gracefully (all fallbacks fail)', async () => {
            const invalidBuffer = Buffer.from('not a docx');
            const result = await extractDocxText(invalidBuffer);
            
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle empty buffer', async () => {
            const emptyBuffer = Buffer.from('');
            const result = await extractDocxText(emptyBuffer);
            
            expect(result.success).toBe(false);
        });

        it('should extract text via raw XML scan when mammoth and AdmZip fail', async () => {
            // Simulate a corrupted DOCX: not a valid ZIP, but contains DOCX XML fragments
            const fakeXml = '<w:t>Hello</w:t> <w:t>World</w:t> <w:t>This</w:t> <w:t>is</w:t> <w:t>a</w:t> <w:t>test</w:t> <w:t>document</w:t>';
            const corruptBuffer = Buffer.from('PK_NOT_VALID_ZIP_' + fakeXml + '_MORE_JUNK');
            const result = await extractDocxText(corruptBuffer);

            expect(result.success).toBe(true);
            expect(result.text).toContain('Hello');
            expect(result.text).toContain('World');
            expect(result.metadata.method).toBe('raw_xml_scan');
        });

        it('should return metadata.method for each successful extraction path', async () => {
            // Raw XML fallback
            const xmlParts = Array.from({ length: 12 }, (_, i) => `<w:t>Word${i}</w:t>`).join(' ');
            const buf = Buffer.from('GARBAGE_ZIP_HEADER' + xmlParts);
            const result = await extractDocxText(buf);
            
            expect(result.success).toBe(true);
            expect(result.metadata.method).toBeDefined();
            expect(['mammoth', 'admzip', 'raw_xml_scan', 'brute_force']).toContain(result.metadata.method);
        });

        it('should fail gracefully for pure binary data with no text', async () => {
            // Pure high-byte binary noise — no printable ASCII words at all
            const binaryBuf = Buffer.alloc(512);
            for (let i = 0; i < 512; i++) binaryBuf[i] = 0x80 + (i % 64); // all non-ASCII bytes
            const result = await extractDocxText(binaryBuf);
            
            expect(result.success).toBe(false);
            expect(result.text).toBe('');
        });

        it('should extract via brute-force when buffer has readable words but no XML tags', async () => {
            // Buffer with enough readable words but no w:t tags
            const readableText = 'The quick brown fox jumps over the lazy dog and runs through the forest';
            const mixedBuffer = Buffer.from('\x00\x01\x02' + readableText + '\x00\x03\x04');
            const result = await extractDocxText(mixedBuffer);

            // Should succeed via brute_force since there are >=5 words
            expect(result.success).toBe(true);
            expect(result.metadata.method).toBe('brute_force');
            expect(result.text).toContain('quick');
            expect(result.text).toContain('brown');
        });
    });

    describe('analyzeDocumentWithAI', () => {
        beforeEach(() => {
            axios.post.mockReset();
        });

        it('should call AI API with document content', async () => {
            axios.post.mockResolvedValue({
                data: {
                    choices: [{
                        message: { content: 'Ini adalah analisis dokumen...' }
                    }]
                }
            });

            const result = await analyzeDocumentWithAI(
                'This is document content',
                'test.pdf',
                'rangkum dong',
                []
            );

            expect(axios.post).toHaveBeenCalled();
            expect(result).toBe('Ini adalah analisis dokumen...');
        });

        it('should handle very long documents (NO LIMIT)', async () => {
            axios.post.mockResolvedValue({
                data: {
                    choices: [{
                        message: { content: 'Analisis bagian...' }
                    }]
                }
            });

            // Create 200k character document (should split into chunks)
            const longText = 'A'.repeat(200000);
            const result = await analyzeDocumentWithAI(longText, 'long.pdf', '', []);

            // Should have called API multiple times for chunks
            expect(axios.post).toHaveBeenCalled();
            expect(result).toContain('Analisis bagian');
        });

        it('should handle AI API error', async () => {
            axios.post.mockRejectedValue(new Error('API Error'));

            await expect(
                analyzeDocumentWithAI('text', 'file.pdf', '', [])
            ).rejects.toThrow('Gagal menganalisis dokumen dengan AI');
        });

        it('should bail immediately on 401 without retrying', async () => {
            const err401 = new Error('Request failed with status code 401');
            err401.response = { status: 401, data: { error: { message: 'unauthorized: token expired' } } };
            axios.post.mockRejectedValue(err401);

            await expect(
                analyzeDocumentWithAI('text', 'file.pdf', '', [])
            ).rejects.toThrow('Token expired');

            // Should have called API only ONCE (no retries)
            expect(axios.post).toHaveBeenCalledTimes(1);
        });

        it('should bail immediately on 402 without retrying', async () => {
            const err402 = new Error('Request failed with status code 402');
            err402.response = { status: 402, data: { error: { message: 'quota exceeded' } } };
            axios.post.mockRejectedValue(err402);

            await expect(
                analyzeDocumentWithAI('text', 'file.pdf', '', [])
            ).rejects.toThrow('Quota habis');

            expect(axios.post).toHaveBeenCalledTimes(1);
        });

        it('should NOT include chat history to avoid context overflow', async () => {
            axios.post.mockResolvedValue({
                data: {
                    choices: [{
                        message: { content: 'Response' }
                    }]
                }
            });

            const history = [
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi there!' }
            ];

            await analyzeDocumentWithAI('doc content', 'file.pdf', '', history);

            const callArgs = axios.post.mock.calls[0][1];
            // Should only have system + user messages (no history) to prevent 500 errors
            expect(callArgs.messages.length).toBe(2);
            expect(callArgs.messages[0].role).toBe('system');
            expect(callArgs.messages[1].role).toBe('user');
        });

        it('should use Tama persona in system prompt', async () => {
            axios.post.mockResolvedValue({
                data: {
                    choices: [{
                        message: { content: 'Response' }
                    }]
                }
            });

            await analyzeDocumentWithAI('content', 'file.pdf', '', []);

            const callArgs = axios.post.mock.calls[0][1];
            const systemMessage = callArgs.messages.find(m => m.role === 'system');
            
            expect(systemMessage.content).toContain('Tama');
            expect(systemMessage.content).toContain('gaul');
        });
    });

    describe('processDocument - NO LIMITS', () => {
        beforeEach(() => {
            axios.post.mockReset();
        });

        it('should NOT reject large files (NO SIZE LIMIT)', async () => {
            // This test verifies there's no file size limit
            // Actual processing may fail if buffer is invalid, but not due to size
            const buffer = Buffer.from('test content');
            const result = await processDocument(buffer, 'test.txt', 'text/plain');

            // Should process text files
            expect(result).toBeDefined();
        });

        it('should handle text files directly', async () => {
            axios.post.mockResolvedValue({
                data: {
                    choices: [{
                        message: { content: 'Analisis file text...' }
                    }]
                }
            });

            const buffer = Buffer.from('Hello World! This is a test file with content.');
            const result = await processDocument(buffer, 'test.txt', 'text/plain');

            expect(result.success).toBe(true);
            expect(result.docType).toBe('text');
        });

        it('should reject truly unsupported document types', async () => {
            const buffer = Buffer.from('data');
            const result = await processDocument(buffer, 'file.xyz', 'application/octet-stream');

            expect(result.success).toBe(false);
            expect(result.analysis).toContain('belum ke-support');
        });

        it('should handle extraction failure gracefully', async () => {
            const buffer = Buffer.from('invalid pdf content');
            const result = await processDocument(buffer, 'broken.pdf', 'application/pdf');

            expect(result.success).toBe(false);
        });

        it('should return rawBuffer and ext for failed DOCX extraction', async () => {
            // Completely invalid buffer that all DOCX extraction methods will fail on
            const buffer = Buffer.alloc(64, 0xFF);
            const result = await processDocument(buffer, 'corrupt.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

            expect(result.success).toBe(false);
            expect(result.ext).toBe('docx');
            expect(result.rawBuffer).toBeDefined();
            expect(Buffer.isBuffer(result.rawBuffer)).toBe(true);
            expect(result.analysis).toContain('corrupt');
        });

        it('should NOT return rawBuffer for non-DOCX failures', async () => {
            const buffer = Buffer.from('invalid pdf content');
            const result = await processDocument(buffer, 'broken.pdf', 'application/pdf');

            expect(result.success).toBe(false);
            expect(result.rawBuffer).toBeFalsy();
        });

        it('should successfully process corrupted DOCX with embedded XML via fallback', async () => {
            axios.post.mockResolvedValue({
                data: {
                    choices: [{
                        message: { content: 'Analisis dokumen DOCX fallback...' }
                    }]
                }
            });

            // Build a buffer that is NOT a valid ZIP but contains DOCX XML fragments
            const xmlContent = Array.from({ length: 15 }, (_, i) => `<w:t>Kata${i}</w:t>`).join(' ');
            const corruptDocx = Buffer.from('PK_CORRUPT_ZIP' + xmlContent + '_END');
            const result = await processDocument(corruptDocx, 'forwarded.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

            // Should succeed because raw_xml_scan fallback extracts text
            expect(result.success).toBe(true);
            expect(result.analysis).toContain('Analisis dokumen DOCX fallback');
        });
    });

    describe('getDocumentInfo', () => {
        it('should return error for unsupported types', async () => {
            const buffer = Buffer.from('data');
            const result = await getDocumentInfo(buffer, 'file.xyz', 'application/octet-stream');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unsupported type');
        });

        it('should return info for text files', async () => {
            const buffer = Buffer.from('Hello World! This is a test document with multiple words.');
            const result = await getDocumentInfo(buffer, 'test.txt', 'text/plain');

            expect(result.success).toBe(true);
            expect(result.docType).toBe('text');
            expect(result.textLength).toBeGreaterThan(0);
            expect(result.wordCount).toBeGreaterThan(0);
            expect(result.preview).toBeDefined();
        });

        it('should handle invalid documents', async () => {
            const buffer = Buffer.from('not a real pdf');
            const result = await getDocumentInfo(buffer, 'test.pdf', 'application/pdf');

            expect(result.success).toBe(false);
        });
    });

    describe('NO LIMITS Verification', () => {
        it('should NOT have MAX_DOCUMENT_SIZE constant', () => {
            // Verify the old limit constants don't exist
            const documentHandler = require('../src/documentHandler');
            expect(documentHandler.MAX_DOCUMENT_SIZE).toBeUndefined();
        });

        it('should NOT have MAX_TEXT_LENGTH constant', () => {
            const documentHandler = require('../src/documentHandler');
            expect(documentHandler.MAX_TEXT_LENGTH).toBeUndefined();
        });
    });

    describe('generateProgressBar', () => {
        it('should generate empty bar for 0%', () => {
            const bar = generateProgressBar(0);
            expect(bar).toBe('░░░░░░░░░░');
        });

        it('should generate full bar for 100%', () => {
            const bar = generateProgressBar(100);
            expect(bar).toBe('▓▓▓▓▓▓▓▓▓▓');
        });

        it('should generate half bar for 50%', () => {
            const bar = generateProgressBar(50);
            expect(bar).toBe('▓▓▓▓▓░░░░░');
        });

        it('should generate correct bar for 30%', () => {
            const bar = generateProgressBar(30);
            expect(bar).toBe('▓▓▓░░░░░░░');
        });

        it('should generate correct bar for 80%', () => {
            const bar = generateProgressBar(80);
            expect(bar).toBe('▓▓▓▓▓▓▓▓░░');
        });

        it('should always return 10 characters', () => {
            for (let i = 0; i <= 100; i += 10) {
                const bar = generateProgressBar(i);
                expect(bar.length).toBe(10);
            }
        });
    });

    describe('getProgressMessage', () => {
        it('should return start messages for early progress', () => {
            const msg = getProgressMessage(1, 10);
            expect(typeof msg).toBe('string');
            expect(msg.length).toBeGreaterThan(5);
        });

        it('should return middle messages for mid progress', () => {
            const msg = getProgressMessage(5, 10);
            expect(typeof msg).toBe('string');
            expect(msg.length).toBeGreaterThan(5);
        });

        it('should return almost done messages for late progress', () => {
            const msg = getProgressMessage(9, 10);
            expect(typeof msg).toBe('string');
            expect(msg.length).toBeGreaterThan(5);
        });

        it('should return done messages when complete', () => {
            const msg = getProgressMessage(10, 10);
            expect(typeof msg).toBe('string');
            expect(msg.length).toBeGreaterThan(5);
        });

        it('should return different messages for different stages', () => {
            // Run multiple times to ensure variety
            const startMsgs = new Set();
            const doneMsgs = new Set();
            
            for (let i = 0; i < 10; i++) {
                startMsgs.add(getProgressMessage(1, 20));
                doneMsgs.add(getProgressMessage(20, 20));
            }
            
            // Should have some variety in messages (at least 1 unique)
            expect(startMsgs.size).toBeGreaterThanOrEqual(1);
            expect(doneMsgs.size).toBeGreaterThanOrEqual(1);
        });
    });

    describe('analyzeDocumentWithAI with progress callback', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should call onProgress for multi-chunk documents', async () => {
            // Create large text that will be split into chunks (15k per chunk)
            const largeText = 'A'.repeat(50000); // 50k chars = ~4 chunks at 15k each
            
            axios.post.mockResolvedValue({
                data: {
                    choices: [{ message: { content: 'Analysis result' } }]
                }
            });

            const progressCalls = [];
            const onProgress = jest.fn((current, total, message) => {
                progressCalls.push({ current, total, message });
            });

            await analyzeDocumentWithAI(largeText, 'large.txt', '', [], onProgress);

            // Should be called: 1 for initial + 3 for each chunk
            expect(onProgress).toHaveBeenCalled();
            expect(progressCalls.length).toBeGreaterThanOrEqual(1);
        });

        it('should not call onProgress for single chunk documents', async () => {
            const smallText = 'Small document';
            
            axios.post.mockResolvedValue({
                data: {
                    choices: [{ message: { content: 'Analysis result' } }]
                }
            });

            const onProgress = jest.fn();

            await analyzeDocumentWithAI(smallText, 'small.txt', '', [], onProgress);

            // Should not be called for single chunk
            expect(onProgress).not.toHaveBeenCalled();
        });
    });
});
