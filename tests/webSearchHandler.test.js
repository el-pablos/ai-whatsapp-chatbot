/**
 * Unit Tests - Web Search Handler Module
 * 
 * Test cases untuk validasi:
 * 1. detectSearchRequest with context awareness
 * 2. Avoiding false positives (like "berapa lama" -> searching "lama")
 */

const {
    detectSearchRequest
} = require('../src/webSearchHandler');

describe('Web Search Handler Module', () => {

    describe('detectSearchRequest', () => {

        // ═══════════════════════════════════════════════════════════
        // Valid Search Requests
        // ═══════════════════════════════════════════════════════════
        describe('should detect valid search requests', () => {

            it('should detect explicit "cari" command', () => {
                const result = detectSearchRequest('cari resep nasi goreng');
                expect(result).not.toBeNull();
                expect(result.isSearch).toBe(true);
                expect(result.query).toBe('resep nasi goreng');
            });

            it('should detect "/search" command', () => {
                const result = detectSearchRequest('/search how to code');
                expect(result).not.toBeNull();
                expect(result.isSearch).toBe(true);
                expect(result.query).toBe('how to code');
            });

            it('should detect "googling" request', () => {
                const result = detectSearchRequest('googling tutorial javascript');
                expect(result).not.toBeNull();
                expect(result.isSearch).toBe(true);
            });

            it('should detect "apa itu" question', () => {
                const result = detectSearchRequest('apa itu blockchain');
                expect(result).not.toBeNull();
                expect(result.isSearch).toBe(true);
                expect(result.query).toBe('blockchain');
            });

            it('should detect "siapa itu" question', () => {
                const result = detectSearchRequest('siapa itu elon musk');
                expect(result).not.toBeNull();
                expect(result.isSearch).toBe(true);
            });

            it('should detect "X itu apa" pattern', () => {
                const result = detectSearchRequest('machine learning itu apa');
                expect(result).not.toBeNull();
                expect(result.isSearch).toBe(true);
            });

        });

        // ═══════════════════════════════════════════════════════════
        // Conversational Messages - SHOULD NOT TRIGGER SEARCH
        // ═══════════════════════════════════════════════════════════
        describe('should NOT detect conversational messages as search', () => {

            it('should NOT detect "berapa lama" as search for "lama"', () => {
                const result = detectSearchRequest('berapa lama prosesnya');
                expect(result).toBeNull();
            });

            it('should NOT detect "kira kira estimasi berapa lama"', () => {
                const result = detectSearchRequest('kira kira estimasi berapa lama');
                expect(result).toBeNull();
            });

            it('should NOT detect "kapan bisa selesai"', () => {
                const result = detectSearchRequest('kapan bisa selesai');
                expect(result).toBeNull();
            });

            it('should NOT detect "gimana caranya"', () => {
                const result = detectSearchRequest('gimana caranya');
                expect(result).toBeNull();
            });

            it('should NOT detect "udah jadi belum"', () => {
                const result = detectSearchRequest('udah jadi belum');
                expect(result).toBeNull();
            });

            it('should NOT detect simple greetings', () => {
                expect(detectSearchRequest('halo')).toBeNull();
                expect(detectSearchRequest('hai bro')).toBeNull();
            });

            it('should NOT detect short messages', () => {
                expect(detectSearchRequest('ok')).toBeNull();
                expect(detectSearchRequest('iya')).toBeNull();
                expect(detectSearchRequest('ga')).toBeNull();
            });

            it('should NOT detect "masih lama ga"', () => {
                const result = detectSearchRequest('masih lama ga');
                expect(result).toBeNull();
            });

            it('should NOT detect "gw mau nanya"', () => {
                const result = detectSearchRequest('gw mau nanya');
                expect(result).toBeNull();
            });

        });

        // ═══════════════════════════════════════════════════════════
        // Edge Cases
        // ═══════════════════════════════════════════════════════════
        describe('edge cases', () => {

            it('should return null for empty string', () => {
                expect(detectSearchRequest('')).toBeNull();
            });

            it('should return null for null/undefined', () => {
                expect(detectSearchRequest(null)).toBeNull();
                expect(detectSearchRequest(undefined)).toBeNull();
            });

            it('should handle mixed case', () => {
                const result = detectSearchRequest('CARI tutorial React');
                expect(result).not.toBeNull();
                expect(result.isSearch).toBe(true);
            });

            it('should require minimum query length', () => {
                // Too short queries should not trigger search
                const result = detectSearchRequest('apa itu a');
                // If detected, query should be meaningful
                if (result) {
                    expect(result.query.length).toBeGreaterThan(2);
                }
            });

        });

    });

});
