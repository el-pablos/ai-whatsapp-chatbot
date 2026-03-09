/**
 * Tests for QR Code Handler
 */

jest.mock('qrcode');

const {
    generateQRCode,
    parseQRCommand,
    createQRResponse,
} = require('../src/qrCodeHandler');

const QRCode = require('qrcode');

describe('QR Code Handler', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        QRCode.toBuffer.mockResolvedValue(Buffer.from('fake-qr-png'));
    });

    describe('generateQRCode', () => {
        test('should generate QR buffer', async () => {
            const result = await generateQRCode('https://example.com');
            expect(Buffer.isBuffer(result)).toBe(true);
            expect(QRCode.toBuffer).toHaveBeenCalledWith(
                'https://example.com',
                expect.objectContaining({ type: 'png', width: 400 })
            );
        });

        test('should accept custom width', async () => {
            await generateQRCode('test', { width: 800 });
            expect(QRCode.toBuffer).toHaveBeenCalledWith(
                'test',
                expect.objectContaining({ width: 800 })
            );
        });

        test('should throw for empty text', async () => {
            await expect(generateQRCode('')).rejects.toThrow();
        });

        test('should throw for null text', async () => {
            await expect(generateQRCode(null)).rejects.toThrow();
        });
    });

    describe('parseQRCommand', () => {
        test('should parse /qr command', () => {
            expect(parseQRCommand('/qr https://example.com')).toBe('https://example.com');
        });

        test('should parse /qr with plain text', () => {
            expect(parseQRCommand('/qr Hello World')).toBe('Hello World');
        });

        test('should return null for empty', () => {
            expect(parseQRCommand('')).toBeNull();
            expect(parseQRCommand(null)).toBeNull();
        });

        test('should return null for /qr without content', () => {
            expect(parseQRCommand('/qr')).toBeNull();
        });
    });

    describe('createQRResponse', () => {
        test('should create response with buffer and URL caption', async () => {
            const result = await createQRResponse('https://example.com');
            expect(Buffer.isBuffer(result.buffer)).toBe(true);
            expect(result.caption).toContain('https://example.com');
        });

        test('should create response with generic caption for non-URL', async () => {
            const result = await createQRResponse('Hello World');
            expect(result.caption).toContain('QR Code generated');
        });
    });
});
