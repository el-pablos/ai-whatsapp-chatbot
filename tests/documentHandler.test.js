/**
 * Tests for documentHandler module
 * PDF and DOCX reading with AI integration
 */

const {
    extractPdfText,
    extractDocxText,
    detectDocumentType,
    analyzeDocumentWithAI,
    processDocument,
    isSupportedDocument,
    getDocumentInfo,
    MAX_DOCUMENT_SIZE,
    MAX_TEXT_LENGTH
} = require('../src/documentHandler');

// Mock axios for AI calls
jest.mock('axios');
const axios = require('axios');

describe('documentHandler', () => {
    describe('detectDocumentType', () => {
        it('should detect PDF from filename', () => {
            expect(detectDocumentType('document.pdf', null)).toBe('pdf');
            expect(detectDocumentType('REPORT.PDF', null)).toBe('pdf');
        });

        it('should detect PDF from mimetype', () => {
            expect(detectDocumentType('file', 'application/pdf')).toBe('pdf');
        });

        it('should detect DOCX from filename', () => {
            expect(detectDocumentType('document.docx', null)).toBe('docx');
            expect(detectDocumentType('REPORT.DOCX', null)).toBe('docx');
        });

        it('should detect DOCX from mimetype', () => {
            expect(detectDocumentType('file', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('docx');
        });

        it('should detect old DOC format', () => {
            expect(detectDocumentType('old.doc', null)).toBe('doc');
            expect(detectDocumentType('file', 'application/msword')).toBe('doc');
        });

        it('should return unknown for unsupported types', () => {
            expect(detectDocumentType('image.jpg', null)).toBe('unknown');
            expect(detectDocumentType('data.csv', null)).toBe('unknown');
            expect(detectDocumentType('file', 'text/plain')).toBe('unknown');
        });
    });

    describe('isSupportedDocument', () => {
        it('should return true for PDF', () => {
            expect(isSupportedDocument('doc.pdf', 'application/pdf')).toBe(true);
        });

        it('should return true for DOCX', () => {
            expect(isSupportedDocument('doc.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
        });

        it('should return false for unsupported types', () => {
            expect(isSupportedDocument('image.jpg', 'image/jpeg')).toBe(false);
            expect(isSupportedDocument('old.doc', 'application/msword')).toBe(false);
        });
    });

    describe('Constants', () => {
        it('should have MAX_DOCUMENT_SIZE of 10MB', () => {
            expect(MAX_DOCUMENT_SIZE).toBe(10 * 1024 * 1024);
        });

        it('should have MAX_TEXT_LENGTH defined', () => {
            expect(MAX_TEXT_LENGTH).toBe(50000);
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
        it('should handle invalid DOCX buffer', async () => {
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

        it('should truncate long documents', async () => {
            axios.post.mockResolvedValue({
                data: {
                    choices: [{
                        message: { content: 'Analisis...' }
                    }]
                }
            });

            const longText = 'A'.repeat(60000);
            await analyzeDocumentWithAI(longText, 'long.pdf', '', []);

            const callArgs = axios.post.mock.calls[0][1];
            const userMessage = callArgs.messages.find(m => m.role === 'user');
            
            // Should contain truncation notice
            expect(userMessage.content).toContain('terpotong');
        });

        it('should handle AI API error', async () => {
            axios.post.mockRejectedValue(new Error('API Error'));

            await expect(
                analyzeDocumentWithAI('text', 'file.pdf', '', [])
            ).rejects.toThrow('Gagal menganalisis dokumen dengan AI');
        });

        it('should include chat history in context', async () => {
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
            expect(callArgs.messages.length).toBeGreaterThan(2);
        });
    });

    describe('processDocument', () => {
        beforeEach(() => {
            axios.post.mockReset();
        });

        it('should reject files over size limit', async () => {
            const largeBuffer = Buffer.alloc(15 * 1024 * 1024); // 15MB
            const result = await processDocument(largeBuffer, 'big.pdf', 'application/pdf');

            expect(result.success).toBe(false);
            expect(result.error).toContain('terlalu besar');
        });

        it('should reject unsupported document types', async () => {
            const buffer = Buffer.from('data');
            const result = await processDocument(buffer, 'file.txt', 'text/plain');

            expect(result.success).toBe(false);
            expect(result.analysis).toContain('PDF sama DOCX');
        });

        it('should reject old DOC format', async () => {
            const buffer = Buffer.from('data');
            const result = await processDocument(buffer, 'old.doc', 'application/msword');

            expect(result.success).toBe(false);
            expect(result.analysis).toContain('convert');
        });

        it('should handle extraction failure gracefully', async () => {
            const buffer = Buffer.from('invalid pdf content');
            const result = await processDocument(buffer, 'broken.pdf', 'application/pdf');

            expect(result.success).toBe(false);
        });
    });

    describe('getDocumentInfo', () => {
        it('should return error for unsupported types', async () => {
            const buffer = Buffer.from('data');
            const result = await getDocumentInfo(buffer, 'file.txt', 'text/plain');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unsupported type');
        });

        it('should handle invalid documents', async () => {
            const buffer = Buffer.from('not a real pdf');
            const result = await getDocumentInfo(buffer, 'test.pdf', 'application/pdf');

            expect(result.success).toBe(false);
        });
    });

    describe('AI Integration', () => {
        beforeEach(() => {
            axios.post.mockReset();
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

        it('should include user request in analysis', async () => {
            axios.post.mockResolvedValue({
                data: {
                    choices: [{
                        message: { content: 'Response' }
                    }]
                }
            });

            await analyzeDocumentWithAI('content', 'file.pdf', 'rangkum point utama', []);

            const callArgs = axios.post.mock.calls[0][1];
            const userMessage = callArgs.messages.find(m => m.role === 'user');
            
            expect(userMessage.content).toContain('rangkum point utama');
        });

        it('should send correct model to API', async () => {
            axios.post.mockResolvedValue({
                data: {
                    choices: [{
                        message: { content: 'Response' }
                    }]
                }
            });

            await analyzeDocumentWithAI('content', 'file.pdf', '', []);

            const callArgs = axios.post.mock.calls[0][1];
            expect(callArgs.model).toContain('claude');
        });
    });
});
