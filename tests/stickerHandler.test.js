/**
 * Unit Tests - Sticker Handler Module
 * 
 * Test cases untuk validasi:
 * 1. isStickerRequest detection with stricter logic
 * 2. Avoiding false positives for "analisis foto"
 */

const {
    isStickerRequest
} = require('../src/stickerHandler');

describe('Sticker Handler Module', () => {

    describe('isStickerRequest', () => {

        // ═══════════════════════════════════════════════════════════
        // Valid Sticker Requests
        // ═══════════════════════════════════════════════════════════
        describe('should detect valid sticker requests', () => {

            it('should detect exact "sticker" keyword', () => {
                expect(isStickerRequest('sticker')).toBe(true);
            });

            it('should detect exact "stiker" keyword', () => {
                expect(isStickerRequest('stiker')).toBe(true);
            });

            it('should detect exact "stk" keyword', () => {
                expect(isStickerRequest('stk')).toBe(true);
            });

            it('should detect "jadiin sticker" phrase', () => {
                expect(isStickerRequest('jadiin sticker dong')).toBe(true);
            });

            it('should detect "bikin stiker" phrase', () => {
                expect(isStickerRequest('bikin stiker')).toBe(true);
            });

            it('should detect "sticker dong" phrase', () => {
                expect(isStickerRequest('sticker dong')).toBe(true);
            });

            it('should detect "jadikan sticker" phrase', () => {
                expect(isStickerRequest('jadikan sticker')).toBe(true);
            });

            it('should be case insensitive', () => {
                expect(isStickerRequest('STICKER')).toBe(true);
                expect(isStickerRequest('Stiker')).toBe(true);
            });

        });

        // ═══════════════════════════════════════════════════════════
        // FALSE POSITIVES - Should NOT trigger sticker
        // ═══════════════════════════════════════════════════════════
        describe('should NOT detect non-sticker requests', () => {

            it('should NOT detect "analisis foto ini"', () => {
                expect(isStickerRequest('analisis foto ini')).toBe(false);
            });

            it('should NOT detect "analisa gambar"', () => {
                expect(isStickerRequest('analisa gambar')).toBe(false);
            });

            it('should NOT detect "lihat gambar ini"', () => {
                expect(isStickerRequest('lihat gambar ini')).toBe(false);
            });

            it('should NOT detect "apa ini"', () => {
                expect(isStickerRequest('apa ini')).toBe(false);
            });

            it('should NOT detect "jelaskan gambar"', () => {
                expect(isStickerRequest('jelaskan gambar')).toBe(false);
            });

            it('should NOT detect "tebak suku"', () => {
                expect(isStickerRequest('tebak suku')).toBe(false);
            });

            it('should NOT detect "describe this image"', () => {
                expect(isStickerRequest('describe this image')).toBe(false);
            });

            it('should NOT detect "cek foto"', () => {
                expect(isStickerRequest('cek foto')).toBe(false);
            });

            it('should NOT detect messages about sticker inability', () => {
                expect(isStickerRequest('gw gabisa kirim sticker')).toBe(false);
                expect(isStickerRequest('tidak bisa sticker')).toBe(false);
            });

        });

        // ═══════════════════════════════════════════════════════════
        // Edge Cases
        // ═══════════════════════════════════════════════════════════
        describe('edge cases', () => {

            it('should return false for empty string', () => {
                expect(isStickerRequest('')).toBe(false);
            });

            it('should return false for null/undefined', () => {
                expect(isStickerRequest(null)).toBe(false);
                expect(isStickerRequest(undefined)).toBe(false);
            });

            it('should handle whitespace', () => {
                expect(isStickerRequest('  sticker  ')).toBe(true);
            });

            it('should NOT trigger on partial word match in longer text', () => {
                // "sticker" appears but in context of analysis
                expect(isStickerRequest('analisis sticker yang dikirim')).toBe(false);
            });

        });

    });

});
